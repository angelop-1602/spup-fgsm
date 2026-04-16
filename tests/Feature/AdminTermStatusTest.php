<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createUserWithRole(string $roleName): User
{
    $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

    /** @var User $user */
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

test('admin can update a term active status', function (): void {
    $admin = createUserWithRole('ADMIN');

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'INACTIVE',
        ])
        ->assertRedirect(route('admin.terms.index'));

    expect($term->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'ACTIVE',
        ])
        ->assertRedirect(route('admin.terms.index'));

    expect($term->fresh()->is_active)->toBeTrue();
});

test('non admin cannot update a term active status', function (): void {
    $staff = createUserWithRole('REGISTRAR_STAFF');

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'Second Semester',
        'period_code' => '2S-2025-2026',
        'is_active' => true,
    ]);

    $this->actingAs($staff)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'INACTIVE',
        ])
        ->assertForbidden();
});

test('term index pages expose completion counts for admin staff and dean', function (): void {
    $admin = createUserWithRole('ADMIN');
    $staff = createUserWithRole('REGISTRAR_STAFF');
    $dean = createUserWithRole('DEAN');

    $department = Department::create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    $facultyOne = Faculty::create([
        'faculty_code' => 'SITE-001',
        'full_name' => 'Faculty One',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $facultyTwo = Faculty::create([
        'faculty_code' => 'SITE-002',
        'full_name' => 'Faculty Two',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'is_active' => true,
    ]);

    FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $facultyOne->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $facultyTwo->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.terms.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Terms/Index')
            ->where('terms.data.0.total_loads', 2)
            ->where('terms.data.0.completed_loads', 1)
        );

    $this->actingAs($staff)
        ->get(route('staff.terms.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Terms/Index')
            ->where('terms.data.0.total_loads', 2)
            ->where('terms.data.0.completed_loads', 1)
        );

    $this->actingAs($dean)
        ->get(route('dean.terms.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dean/Terms/Index')
            ->where('terms.data.0.total_loads', 2)
            ->where('terms.data.0.completed_loads', 1)
        );
});
