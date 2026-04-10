<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('admin dashboard defaults to the most recent active term', function (): void {
    $admin = createAdminUser();

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'ADASH-001',
        'full_name' => 'Admin Dashboard Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $olderActive = createTerm(2024, 2025, 'First Semester', '1S-2024-2025', true);
    $newerActive = createTerm(2025, 2026, 'First Semester', '1S-2025-2026', true);
    $newestInactive = createTerm(2026, 2027, 'First Semester', '1S-2026-2027', false);

    FacultyLoad::query()->create([
        'term_id' => $olderActive->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::FOR_REVISION,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $newerActive->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $newestInactive->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $this->actingAs($admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('selectedTermId', $newerActive->id)
            ->where('summary.completedLoads', 1)
            ->where('summary.notCompletedLoads', 0)
            ->where('summary.totalLoads', 1)
        );
});

test('admin dashboard honors term_id query selection', function (): void {
    $admin = createAdminUser();

    /** @var Department $department */
    $department = Department::query()->create([
        'name' => 'School of Nursing and Allied Health Sciences',
        'code' => 'SNAHS',
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'ADASH-002',
        'full_name' => 'Admin Dashboard Faculty Two',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $firstTerm = createTerm(2025, 2026, 'First Semester', '1S-2025-2026', true);
    $secondTerm = createTerm(2025, 2026, 'Second Semester', '2S-2025-2026', false);

    FacultyLoad::query()->create([
        'term_id' => $firstTerm->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $secondTerm->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::CLEARED,
    ]);

    $this->actingAs($admin)
        ->get('/admin?term_id='.$secondTerm->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('selectedTermId', $secondTerm->id)
            ->where('summary.completedLoads', 1)
            ->where('summary.notCompletedLoads', 0)
            ->where('summary.totalLoads', 1)
        );
});

test('admin dashboard includes all departments and counts part-time from active roster', function (): void {
    $admin = createAdminUser();

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

    /** @var Department $snahs */
    $snahs = Department::query()->create([
        'name' => 'School of Nursing and Allied Health Sciences',
        'code' => 'SNAHS',
    ]);

    $selectedTerm = createTerm(2025, 2026, 'First Semester', '1S-2025-2026', true);
    $otherTerm = createTerm(2025, 2026, 'Second Semester', '2S-2025-2026', false);

    $sitePartTime = Faculty::query()->create([
        'faculty_code' => 'ADASH-SITE-PT',
        'full_name' => 'Site Part Time',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
        'emp_status' => 'Part-time',
    ]);

    $siteFullTime = Faculty::query()->create([
        'faculty_code' => 'ADASH-SITE-FT',
        'full_name' => 'Site Full Time',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
        'emp_status' => 'Full-time',
    ]);

    $sastePartTime = Faculty::query()->create([
        'faculty_code' => 'ADASH-SASTE-PT',
        'full_name' => 'Saste Part Time',
        'department_id' => $saste->id,
        'status' => 'ACTIVE',
        'emp_status' => 'PART TIME',
    ]);

    Faculty::query()->create([
        'faculty_code' => 'ADASH-SASTE-INACTIVE',
        'full_name' => 'Saste Inactive',
        'department_id' => $saste->id,
        'status' => 'INACTIVE',
        'emp_status' => 'Part-time',
    ]);

    FacultyLoad::query()->create([
        'term_id' => $selectedTerm->id,
        'faculty_id' => $sitePartTime->id,
        'department_id' => $site->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $selectedTerm->id,
        'faculty_id' => $siteFullTime->id,
        'department_id' => $site->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $selectedTerm->id,
        'faculty_id' => $sastePartTime->id,
        'department_id' => $saste->id,
        'status' => FacultyLoadStatus::FOR_REVISION,
    ]);

    FacultyLoad::query()->create([
        'term_id' => $otherTerm->id,
        'faculty_id' => $sitePartTime->id,
        'department_id' => $site->id,
        'status' => FacultyLoadStatus::CLEARED,
    ]);

    $this->actingAs($admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('selectedTermId', $selectedTerm->id)
            ->where('summary.completedLoads', 1)
            ->where('summary.notCompletedLoads', 2)
            ->where('summary.totalLoads', 3)
            ->where('summary.activeFacultyCount', 3)
            ->where('summary.partTimeCount', 2)
            ->where('summary.fullTimeCount', 1)
            ->where('departmentCompletion', function ($rows) use ($site, $saste, $snahs): bool {
                $byDepartmentId = collect($rows)->keyBy('departmentId');

                return ($byDepartmentId[$site->id]['completedCount'] ?? null) === 1
                    && ($byDepartmentId[$site->id]['notCompletedCount'] ?? null) === 1
                    && ($byDepartmentId[$saste->id]['completedCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['notCompletedCount'] ?? null) === 1
                    && ($byDepartmentId[$snahs->id]['completedCount'] ?? null) === 0
                    && ($byDepartmentId[$snahs->id]['notCompletedCount'] ?? null) === 0;
            })
            ->where('departmentEmployment', function ($rows) use ($site, $saste, $snahs): bool {
                $byDepartmentId = collect($rows)->keyBy('departmentId');

                return ($byDepartmentId[$site->id]['partTimeCount'] ?? null) === 1
                    && ($byDepartmentId[$site->id]['fullTimeCount'] ?? null) === 1
                    && ($byDepartmentId[$site->id]['activeFacultyCount'] ?? null) === 2
                    && ($byDepartmentId[$saste->id]['partTimeCount'] ?? null) === 1
                    && ($byDepartmentId[$saste->id]['fullTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$saste->id]['activeFacultyCount'] ?? null) === 1
                    && ($byDepartmentId[$snahs->id]['partTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$snahs->id]['fullTimeCount'] ?? null) === 0
                    && ($byDepartmentId[$snahs->id]['activeFacultyCount'] ?? null) === 0;
            })
        );
});

function createAdminUser(): User
{
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    return $admin;
}

function createTerm(
    int $yearStart,
    int $yearEnd,
    string $termName,
    string $periodCode,
    bool $isActive,
): Term {
    return Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => $yearStart,
        'year_end' => $yearEnd,
        'academic_year' => sprintf('%d-%d', $yearStart, $yearEnd),
        'term_name' => $termName,
        'period_code' => $periodCode,
        'display_code' => sprintf('%s, AY %d-%d', $termName, $yearStart, $yearEnd),
        'is_active' => $isActive,
    ]);
}
