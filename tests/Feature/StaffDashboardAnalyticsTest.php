<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('staff dashboard returns analytics payload and supports term filtering', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    /** @var Department $site */
    $site = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Department $saste */
    $saste = Department::query()->create([
        'name' => 'School of Science Arts and Teacher Education',
        'code' => 'SASTE',
    ]);

    /** @var Faculty $siteFaculty */
    $siteFaculty = Faculty::query()->create([
        'faculty_code' => 'STAFF-DASH-001',
        'full_name' => 'Staff Dashboard Site Faculty',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
        'emp_status' => 'Part Time',
    ]);

    /** @var Faculty $sasteFaculty */
    $sasteFaculty = Faculty::query()->create([
        'faculty_code' => 'STAFF-DASH-002',
        'full_name' => 'Staff Dashboard Saste Faculty',
        'department_id' => $saste->id,
        'status' => 'ACTIVE',
        'emp_status' => 'Full-time',
    ]);

    $activeTerm = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    $otherTerm = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'Second Semester',
        'period_code' => '2S-2025-2026',
        'display_code' => 'Second Semester, AY 2025-2026',
        'is_active' => false,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $activeTerm->id,
        'faculty_id' => $siteFaculty->id,
        'department_id' => $site->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $otherTerm->id,
        'faculty_id' => $sasteFaculty->id,
        'department_id' => $saste->id,
        'status' => FacultyLoadStatus::FOR_REVISION,
    ]);

    $this->actingAs($staff)
        ->get('/staff')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Dashboard')
            ->where('selectedTermId', $activeTerm->id)
            ->where('summary.completedLoads', 1)
            ->where('summary.notCompletedLoads', 0)
            ->where('summary.totalLoads', 1)
            ->where('summary.activeFacultyCount', 2)
            ->where('summary.partTimeCount', 1)
            ->where('summary.fullTimeCount', 1)
            ->where('departmentEmployment', function ($rows) use ($site, $saste): bool {
                $byDepartmentId = collect($rows)->keyBy('departmentId');

                return ($byDepartmentId[$site->id]['activeFacultyCount'] ?? null) === 1
                    && ($byDepartmentId[$site->id]['partTimeCount'] ?? null) === 1
                    && ($byDepartmentId[$site->id]['fullTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['activeFacultyCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['partTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['fullTimeCount'] ?? null) === 0;
            })
        );

    $this->actingAs($staff)
        ->get('/staff?term_id='.$otherTerm->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Dashboard')
            ->where('selectedTermId', $otherTerm->id)
            ->where('summary.completedLoads', 0)
            ->where('summary.notCompletedLoads', 1)
            ->where('summary.totalLoads', 1)
            ->where('departmentEmployment', function ($rows) use ($site, $saste): bool {
                $byDepartmentId = collect($rows)->keyBy('departmentId');

                return ($byDepartmentId[$site->id]['activeFacultyCount'] ?? null) === 0
                    && ($byDepartmentId[$site->id]['partTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$site->id]['fullTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['activeFacultyCount'] ?? null) === 1
                    && ($byDepartmentId[$saste->id]['partTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['fullTimeCount'] ?? null) === 1;
            })
        );
});

test('staff dashboard route remains restricted to registrar staff role', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $this->actingAs($admin)
        ->get('/staff')
        ->assertForbidden();
});
