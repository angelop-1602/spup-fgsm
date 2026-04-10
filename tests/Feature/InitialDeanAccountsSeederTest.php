<?php

use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use App\Support\DepartmentDirectory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

test('initial dean accounts seeder merges legacy departments and provisions dean accounts', function (): void {
    $gsDoctoral = Department::create(['name' => 'GS(Doctoral)', 'code' => null]);
    $gsMasters = Department::create(['name' => 'GS(Masters)', 'code' => null]);
    Department::create(['name' => 'SNAHS(Allied)', 'code' => null]);
    Department::create(['name' => 'SNAHS(Nursing)', 'code' => null]);
    Department::create(['name' => 'SITE', 'code' => null]);
    Department::create(['name' => 'SASTE', 'code' => null]);
    Department::create(['name' => 'SBAHM', 'code' => null]);
    Department::create(['name' => 'ETEEAP', 'code' => null]);

    $legacyUser = User::factory()->create([
        'department_id' => $gsDoctoral->id,
    ]);

    $faculty = Faculty::create([
        'faculty_code' => 'GS001',
        'full_name' => 'Graduate Faculty',
        'department_id' => $gsMasters->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
    ]);

    $pendingLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $gsDoctoral->id,
        'status' => 'PENDING',
    ]);

    $submittedLoad = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $gsMasters->id,
        'status' => 'SUBMITTED',
    ]);

    $actor = User::factory()->create();

    DB::table('faculty_load_items')->insert([
        [
            'faculty_load_id' => $pendingLoad->id,
            'subject_id' => null,
            'subject_code' => 'SUBJ1',
            'section' => null,
            'schedule' => null,
            'room' => null,
            'units_lec' => 3,
            'units_lab' => 0,
            'total_units' => 3,
            'raw_payload_json' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'faculty_load_id' => $submittedLoad->id,
            'subject_id' => null,
            'subject_code' => 'SUBJ2',
            'section' => null,
            'schedule' => null,
            'room' => null,
            'units_lec' => 3,
            'units_lab' => 0,
            'total_units' => 3,
            'raw_payload_json' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    DB::table('audit_logs')->insert([
        [
            'faculty_load_id' => $pendingLoad->id,
            'actor_user_id' => $actor->id,
            'action' => 'status_change',
            'old_status' => null,
            'new_status' => 'PENDING',
            'notes' => null,
            'created_at' => now(),
        ],
        [
            'faculty_load_id' => $submittedLoad->id,
            'actor_user_id' => $actor->id,
            'action' => 'status_change',
            'old_status' => 'PENDING',
            'new_status' => 'SUBMITTED',
            'notes' => null,
            'created_at' => now(),
        ],
    ]);

    $this->seed(\Database\Seeders\InitialDeanAccountsSeeder::class);

    $this->assertDatabaseMissing('departments', ['name' => 'GS(Doctoral)']);
    $this->assertDatabaseMissing('departments', ['name' => 'GS(Masters)']);
    $this->assertDatabaseMissing('departments', ['name' => 'SNAHS(Allied)']);
    $this->assertDatabaseMissing('departments', ['name' => 'SNAHS(Nursing)']);

    foreach (DepartmentDirectory::canonicalDepartments() as $departmentData) {
        $this->assertDatabaseHas('departments', [
            'name' => $departmentData['name'],
            'code' => $departmentData['code'],
        ]);
    }

    $graduateSchool = Department::query()
        ->where('name', 'GS(Graduate School)')
        ->firstOrFail();

    expect($legacyUser->refresh()->department_id)->toBe($graduateSchool->id);
    expect($faculty->refresh()->department_id)->toBe($graduateSchool->id);

    $mergedLoad = FacultyLoad::query()
        ->where('term_id', $term->id)
        ->where('faculty_id', $faculty->id)
        ->where('department_id', $graduateSchool->id)
        ->firstOrFail();

    expect($mergedLoad->status->value)->toBe('SUBMITTED');

    expect(DB::table('faculty_load_items')->where('faculty_load_id', $mergedLoad->id)->count())->toBe(2);
    expect(DB::table('audit_logs')->where('faculty_load_id', $mergedLoad->id)->count())->toBe(2);

    $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

    foreach (DepartmentDirectory::canonicalDepartments() as $departmentData) {
        $department = Department::query()
            ->where('name', $departmentData['name'])
            ->firstOrFail();

        $dean = User::query()
            ->where('email', $departmentData['email'])
            ->firstOrFail();

        expect($dean->department_id)->toBe($department->id);
        expect($dean->hasRole($deanRole->name))->toBeTrue();
    }

    $siteDean = User::query()->where('email', 'site@spup.edu.ph')->firstOrFail();
    expect(Hash::check(DepartmentDirectory::DEFAULT_DEAN_PASSWORD, $siteDean->password))->toBeTrue();
});
