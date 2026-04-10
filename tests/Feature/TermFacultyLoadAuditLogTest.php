<?php

use App\Domain\AuditLogs\Services\FacultyLoadAuditLogger;
use App\Enums\FacultyLoadStatus;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('admin subject status updates are written to audit logs', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $department = Department::create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    $faculty = Faculty::create([
        'faculty_code' => 'AUDITADMIN',
        'full_name' => 'Audit Admin Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'display_code' => 'First Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    $load = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $item = $load->items()->create([
        'subject_id' => null,
        'subject_code' => 'ITE 109',
        'section' => 'BSIT 2A',
        'schedule' => '8-10:30 am TF',
        'room' => 'LR103',
        'units_lec' => 2,
        'units_lab' => 1,
        'total_units' => 3,
        'status' => 'PENDING',
        'raw_payload_json' => ['subject_description' => 'Advanced Database System'],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.terms.faculty-loads.items.update-status', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
            'item' => $item->id,
        ]), [
            'status' => 'RETURNED',
            'remarks' => 'Schedule conflict',
        ])
        ->assertRedirect(route('admin.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]));

    /** @var AuditLog $log */
    $log = AuditLog::query()->latest('id')->firstOrFail();

    expect($log->faculty_load_id)->toBe($load->id)
        ->and($log->actor_user_id)->toBe($admin->id)
        ->and($log->action)->toBe(FacultyLoadAuditLogger::ACTION_ITEM_STATUS_UPDATED)
        ->and($log->old_status)->toBe('PENDING')
        ->and($log->new_status)->toBe('RETURNED')
        ->and($log->notes)->toContain('subject=ITE 109')
        ->and($log->notes)->toContain('remarks=Schedule conflict')
        ->and($log->created_at)->not->toBeNull();
});

test('staff subject status updates are written to audit logs with staff actor', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    $department = Department::create([
        'name' => 'School of Arts Sciences and Teacher Education',
        'code' => 'SASTE',
    ]);

    $faculty = Faculty::create([
        'faculty_code' => 'AUDITSTAFF',
        'full_name' => 'Audit Staff Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'Second Semester',
        'period_code' => '2S-2025-2026',
        'display_code' => 'Second Semester, AY 2025-2026',
        'is_active' => true,
    ]);

    $load = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    $item = $load->items()->create([
        'subject_id' => null,
        'subject_code' => 'ITE 130',
        'section' => 'BSIT 4B',
        'schedule' => '7:30 am-12:30 pm W',
        'room' => 'LR106',
        'units_lec' => 2,
        'units_lab' => 1,
        'total_units' => 3,
        'status' => 'PENDING',
        'raw_payload_json' => ['subject_description' => 'Data Mining'],
    ]);

    $this->actingAs($staff)
        ->patch(route('staff.terms.faculty-loads.items.update-status', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
            'item' => $item->id,
        ]), [
            'status' => 'SUBMITTED',
        ])
        ->assertRedirect(route('staff.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]));

    /** @var AuditLog $log */
    $log = AuditLog::query()->latest('id')->firstOrFail();

    expect($log->faculty_load_id)->toBe($load->id)
        ->and($log->actor_user_id)->toBe($staff->id)
        ->and($log->action)->toBe(FacultyLoadAuditLogger::ACTION_ITEM_STATUS_UPDATED)
        ->and($log->old_status)->toBe('PENDING')
        ->and($log->new_status)->toBe('SUBMITTED')
        ->and($log->notes)->toContain('subject=ITE 130')
        ->and($log->created_at)->not->toBeNull();
});
