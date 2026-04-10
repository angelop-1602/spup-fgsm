<?php

use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('registrar staff can view faculty loads across all departments', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    $site = Department::create(['name' => 'SITE', 'code' => 'SITE']);
    $saste = Department::create(['name' => 'SASTE', 'code' => 'SASTE']);

    $siteFaculty = Faculty::create([
        'faculty_code' => 'SITE001',
        'full_name' => 'Site Faculty',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
    ]);

    $sasteFaculty = Faculty::create([
        'faculty_code' => 'SASTE001',
        'full_name' => 'Saste Faculty',
        'department_id' => $saste->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
    ]);

    $siteLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $siteFaculty->id,
        'department_id' => $site->id,
        'status' => 'PENDING',
    ]);

    $sasteLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $sasteFaculty->id,
        'department_id' => $saste->id,
        'status' => 'SUBMITTED',
    ]);

    $this->actingAs($staff)
        ->get(route('staff.terms.faculty-loads.show', ['term' => $term->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Terms/FacultyLoads')
            ->has('loads.data', 2)
        );

    $this->actingAs($staff)
        ->get(route('staff.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $siteLoad->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Terms/FacultyLoadShow')
            ->where('load.id', $siteLoad->id)
        );

    $this->actingAs($staff)
        ->get(route('staff.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $sasteLoad->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Terms/FacultyLoadShow')
            ->where('load.id', $sasteLoad->id)
        );
});

test('dean can only view faculty loads from assigned department', function (): void {
    $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

    $site = Department::create(['name' => 'SITE', 'code' => 'SITE']);
    $saste = Department::create(['name' => 'SASTE', 'code' => 'SASTE']);

    /** @var User $dean */
    $dean = User::factory()->create([
        'department_id' => $site->id,
    ]);
    $dean->assignRole($deanRole);

    $siteFaculty = Faculty::create([
        'faculty_code' => 'SITE002',
        'full_name' => 'Site Faculty 2',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
    ]);

    $sasteFaculty = Faculty::create([
        'faculty_code' => 'SASTE002',
        'full_name' => 'Saste Faculty 2',
        'department_id' => $saste->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
    ]);

    $siteLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $siteFaculty->id,
        'department_id' => $site->id,
        'status' => 'PENDING',
    ]);

    $sasteLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $sasteFaculty->id,
        'department_id' => $saste->id,
        'status' => 'PENDING',
    ]);

    $this->actingAs($dean)
        ->get(route('dean.terms.faculty-loads.show', ['term' => $term->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dean/Terms/FacultyLoads')
            ->has('loads.data', 1)
            ->where('loads.data.0.id', $siteLoad->id)
        );

    $this->actingAs($dean)
        ->get(route('dean.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $siteLoad->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dean/Terms/FacultyLoadShow')
            ->where('load.id', $siteLoad->id)
        );

    $this->actingAs($dean)
        ->get(route('dean.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $sasteLoad->id,
        ]))
        ->assertForbidden();
});
