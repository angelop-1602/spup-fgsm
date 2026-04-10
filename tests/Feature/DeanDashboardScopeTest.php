<?php

use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('dean dashboard stats are scoped to dean department only', function (): void {
    $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

    $site = Department::create(['name' => 'SITE', 'code' => 'SITE']);
    $saste = Department::create(['name' => 'SASTE', 'code' => 'SASTE']);

    $dean = User::factory()->create([
        'department_id' => $site->id,
    ]);
    $dean->assignRole($deanRole);

    $siteFacultyOne = Faculty::create([
        'faculty_code' => 'SITE001',
        'full_name' => 'Site Faculty One',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
    ]);

    $siteFacultyTwo = Faculty::create([
        'faculty_code' => 'SITE002',
        'full_name' => 'Site Faculty Two',
        'department_id' => $site->id,
        'status' => 'ACTIVE',
    ]);

    $sasteFaculty = Faculty::create([
        'faculty_code' => 'SASTE001',
        'full_name' => 'Saste Faculty One',
        'department_id' => $saste->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
    ]);

    FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $siteFacultyOne->id,
        'department_id' => $site->id,
        'status' => 'SUBMITTED',
    ]);

    FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $siteFacultyTwo->id,
        'department_id' => $site->id,
        'status' => 'PENDING',
    ]);

    FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $sasteFaculty->id,
        'department_id' => $saste->id,
        'status' => 'FOR_REVISION',
    ]);

    $this->actingAs($dean)
        ->get('/dean')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dean/Dashboard')
            ->where('department.id', $site->id)
            ->where('department.name', 'SITE')
            ->where('stats.totalFacultyCount', 2)
            ->where('stats.loadsSubmitted', 1)
            ->where('stats.loadsPendingRevision', 1)
        );
});
