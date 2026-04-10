<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('admin clearance term view shows only submitted and cleared loads', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Term $term */
    $term = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    /** @var Faculty $submittedFaculty */
    $submittedFaculty = Faculty::query()->create([
        'faculty_code' => 'SUBMIT001',
        'full_name' => 'Submitted Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var Faculty $clearedFaculty */
    $clearedFaculty = Faculty::query()->create([
        'faculty_code' => 'CLEAR001',
        'full_name' => 'Cleared Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var Faculty $pendingFaculty */
    $pendingFaculty = Faculty::query()->create([
        'faculty_code' => 'PEND001',
        'full_name' => 'Pending Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var FacultyLoad $submittedLoad */
    $submittedLoad = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $submittedFaculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    /** @var FacultyLoad $clearedLoad */
    $clearedLoad = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $clearedFaculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::CLEARED,
    ]);

    /** @var FacultyLoad $pendingLoad */
    $pendingLoad = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $pendingFaculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.clearance.show', ['term' => $term->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Clearance/Show')
            ->where('term.id', $term->id)
            ->where('loads.total', 2)
            ->where('loads.data', function ($rows) use ($submittedLoad, $clearedLoad, $pendingLoad): bool {
                $rowArray = is_array($rows) ? $rows : $rows->all();
                $ids = array_map(
                    static fn (array $row): int => (int) ($row['id'] ?? 0),
                    $rowArray,
                );

                return in_array($submittedLoad->id, $ids, true)
                    && in_array($clearedLoad->id, $ids, true)
                    && ! in_array($pendingLoad->id, $ids, true);
            })
        );
});

test('admin can mark submitted faculty load as cleared', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'CLEARME',
        'full_name' => 'Clear Me Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var Term $term */
    $term = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    /** @var FacultyLoad $load */
    $load = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    $this->actingAs($admin)
        ->from(route('admin.clearance.show', ['term' => $term->id]))
        ->patch(route('admin.clearance.clear', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]))
        ->assertRedirect(route('admin.clearance.show', ['term' => $term->id]));

    $load->refresh();
    $term->refresh();

    expect($load->status)->toBe(FacultyLoadStatus::CLEARED)
        ->and($load->checked_by_user_id)->toBe($admin->id)
        ->and($load->checked_at)->not->toBeNull()
        ->and($term->is_completed)->toBeTrue();

    $this->assertDatabaseHas('audit_logs', [
        'faculty_load_id' => $load->id,
        'actor_user_id' => $admin->id,
        'action' => 'FACULTY_LOAD_CLEARED',
        'old_status' => FacultyLoadStatus::SUBMITTED->value,
        'new_status' => FacultyLoadStatus::CLEARED->value,
    ]);
});

test('admin cannot mark non-submitted load as cleared', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'NOTSUB',
        'full_name' => 'Not Submitted Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var Term $term */
    $term = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    /** @var FacultyLoad $load */
    $load = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $this->actingAs($admin)
        ->from(route('admin.clearance.show', ['term' => $term->id]))
        ->patch(route('admin.clearance.clear', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]))
        ->assertRedirect(route('admin.clearance.show', ['term' => $term->id]))
        ->assertSessionHasErrors(['status']);

    $load->refresh();

    expect($load->status)->toBe(FacultyLoadStatus::PENDING);

    $this->assertDatabaseMissing('audit_logs', [
        'faculty_load_id' => $load->id,
        'action' => 'FACULTY_LOAD_CLEARED',
        'new_status' => FacultyLoadStatus::CLEARED->value,
    ]);
});

test('registrar staff cannot access admin clearance routes', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'STAFFNO',
        'full_name' => 'Staff No Access',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var Term $term */
    $term = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    /** @var FacultyLoad $load */
    $load = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    $this->actingAs($staff)
        ->get(route('admin.clearance.index'))
        ->assertForbidden();

    $this->actingAs($staff)
        ->get(route('admin.clearance.show', ['term' => $term->id]))
        ->assertForbidden();

    $this->actingAs($staff)
        ->patch(route('admin.clearance.clear', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]))
        ->assertForbidden();
});
