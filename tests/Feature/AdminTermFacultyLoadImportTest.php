<?php

use App\Domain\AuditLogs\Services\FacultyLoadAuditLogger;
use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Models\Role;

test('admin can import faculty load for a specific term from xlsx', function (): void {
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
        'faculty_code' => 'GUMARANG',
        'full_name' => 'Dr. Sheena Gumarang',
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

    /** @var Subject $subject */
    $subject = Subject::query()->create([
        'code' => 'ITE 109',
        'description' => 'Advanced Database System',
        'units' => 3,
    ]);

    /** @var FacultyLoad $existingLoad */
    $existingLoad = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    $existingLoad->items()->create([
        'subject_id' => null,
        'subject_code' => 'OLD 001',
        'section' => 'OLD-SECTION',
        'schedule' => null,
        'room' => null,
        'units_lec' => 1,
        'units_lab' => 1,
        'total_units' => 2,
        'raw_payload_json' => ['section' => 'OLD-SECTION'],
    ]);

    $file = makeTermFacultyLoadImportFile([
        ['T53', 'BSIT 2A', 'ITE 109', 'Advanced Database System', '3', '3', '2', '1', '5', '8-10:30 am TF', 'LR103', '', '', '', '', '26'],
        ['T107', 'BSIT 4B', 'ITE 130', 'Data Mining and Data Warehousing', '3', '3', '2', '1', '0', '7:30 am-12:30 pm W', 'LR106', '', '', '', '', '28'],
        ['', '', '', '', '18', '15', '13', '5', '5', '', '', '', '', '', '', '0'],
    ]);

    $response = $this->actingAs($admin)
        ->post(route('admin.terms.faculty-loads.import', ['term' => $term->id]), [
            'faculty_id' => $faculty->id,
            'file' => $file,
        ]);

    $response->assertRedirect(route('admin.terms.faculty-loads.show', ['term' => $term->id]));
    $response->assertSessionHas('term_faculty_load_import_summary', function (array $summary): bool {
        return $summary['action'] === 'updated'
            && $summary['imported_rows'] === 2
            && $summary['skipped_rows'] === 1
            && $summary['header_row'] === 8;
    });

    /** @var FacultyLoad $load */
    $load = FacultyLoad::query()
        ->where('term_id', $term->id)
        ->where('faculty_id', $faculty->id)
        ->where('department_id', $department->id)
        ->firstOrFail();

    expect($load->status)->toBe(FacultyLoadStatus::PENDING);
    expect($load->items()->count())->toBe(2);
    expect($load->received_by_user_id)->toBe($admin->id);

    $firstItem = $load->items()->orderBy('id')->firstOrFail();
    expect($firstItem->subject_code)->toBe('ITE 109');
    expect($firstItem->section)->toBe('BSIT 2A');
    expect((string) ($firstItem->status?->value ?? $firstItem->status))->toBe('PENDING');
    expect((float) $firstItem->units_lec)->toBe(2.0);
    expect((float) $firstItem->units_lab)->toBe(1.0);
    expect((float) $firstItem->total_units)->toBe(3.0);
    expect($firstItem->subject_id)->toBe($subject->id);
    $firstPayload = (array) ($firstItem->raw_payload_json ?? []);
    expect($firstPayload)
        ->toHaveKey('subject_description')
        ->toHaveKey('size')
        ->not->toHaveKey('merged_to')
        ->not->toHaveKey('special')
        ->not->toHaveKey('petitioned')
        ->not->toHaveKey('dissolved');

    $this->assertDatabaseHas('audit_logs', [
        'faculty_load_id' => $load->id,
        'actor_user_id' => $admin->id,
        'action' => FacultyLoadAuditLogger::ACTION_IMPORT_UPDATED,
        'old_status' => FacultyLoadStatus::SUBMITTED->value,
        'new_status' => FacultyLoadStatus::PENDING->value,
    ]);
});

test('non admin cannot import faculty load for a specific term', function (): void {
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
        'faculty_code' => 'NOACCESS',
        'full_name' => 'No Access Faculty',
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

    $file = makeTermFacultyLoadImportFile([
        ['T53', 'BSIT 2A', 'ITE 109', 'Advanced Database System', '3', '3', '2', '1', '5', '8-10:30 am TF', 'LR103', '', '', '', '', '26'],
    ]);

    $this->actingAs($staff)
        ->post(route('admin.terms.faculty-loads.import', ['term' => $term->id]), [
            'faculty_id' => $faculty->id,
            'file' => $file,
        ])
        ->assertForbidden();
});

test('admin can view faculty load items in a term', function (): void {
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
        'faculty_code' => 'VIEWLOAD',
        'full_name' => 'View Load Faculty',
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

    $load->items()->create([
        'subject_id' => null,
        'subject_code' => 'ITE 109',
        'section' => 'BSIT 2A',
        'schedule' => '8-10:30 am TF',
        'room' => 'LR103',
        'units_lec' => 2,
        'units_lab' => 1,
        'total_units' => 3,
        'raw_payload_json' => [
            'subject_description' => 'Advanced Database System',
            'hours' => '5',
            'size' => '26',
        ],
    ]);

    $this->actingAs($admin)
        ->get(route('admin.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Terms/FacultyLoadShow')
            ->where('term.id', $term->id)
            ->where('load.id', $load->id)
            ->where('load.faculty.faculty_code', 'VIEWLOAD')
            ->where('load.items.0.subject_code', 'ITE 109')
            ->where('load.items.0.raw_payload_json.subject_description', 'Advanced Database System')
        );
});

test('admin can import faculty load even when faculty has null department', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    /** @var Faculty $faculty */
    $faculty = Faculty::query()->create([
        'faculty_code' => 'NODEPT',
        'full_name' => 'No Department Faculty',
        'department_id' => null,
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

    $file = makeTermFacultyLoadImportFile([
        ['T53', 'BSIT 2A', 'ITE 109', 'Advanced Database System', '3', '3', '2', '1', '5', '8-10:30 am TF', 'LR103', '', '', '', '', '26'],
    ]);

    $response = $this->actingAs($admin)
        ->post(route('admin.terms.faculty-loads.import', ['term' => $term->id]), [
            'faculty_id' => $faculty->id,
            'file' => $file,
        ]);

    $response->assertRedirect(route('admin.terms.faculty-loads.show', ['term' => $term->id]));

    $this->assertDatabaseHas('faculty_loads', [
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => null,
    ]);
});

test('admin can update individual subject status for a faculty load item', function (): void {
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
        'faculty_code' => 'ITEMSTATUS',
        'full_name' => 'Item Status Faculty',
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

    $item = $load->items()->create([
        'subject_id' => null,
        'subject_code' => 'ITE 110',
        'section' => 'BSIT 2B',
        'schedule' => '10:30-12:00 MW',
        'room' => 'LR201',
        'units_lec' => 2,
        'units_lab' => 1,
        'total_units' => 3,
        'raw_payload_json' => ['subject_description' => 'Web Programming'],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.terms.faculty-loads.items.update-status', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
            'item' => $item->id,
        ]), [
            'status' => 'SUBMITTED',
        ])
        ->assertRedirect(route('admin.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]));

    $item->refresh();
    expect((string) ($item->status?->value ?? $item->status))->toBe('SUBMITTED')
        ->and($item->remarks)->toBeNull();

    $load->refresh();
    expect($load->status)->toBe(FacultyLoadStatus::SUBMITTED);

    $this->actingAs($admin)
        ->patch(route('admin.terms.faculty-loads.items.update-status', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
            'item' => $item->id,
        ]), [
            'status' => 'RETURNED',
            'remarks' => 'Please correct schedule overlap.',
        ])
        ->assertRedirect(route('admin.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]));

    $item->refresh();
    expect((string) ($item->status?->value ?? $item->status))->toBe('RETURNED')
        ->and($item->remarks)->toBe('Please correct schedule overlap.');

    $load->refresh();
    expect($load->status)->toBe(FacultyLoadStatus::FOR_REVISION);
});

test('returning individual subject status requires remarks', function (): void {
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
        'faculty_code' => 'ITEMREMARK',
        'full_name' => 'Item Remarks Faculty',
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

    $item = $load->items()->create([
        'subject_id' => null,
        'subject_code' => 'ITE 111',
        'section' => 'BSIT 2C',
        'schedule' => '1:00-2:30 PM TTH',
        'room' => 'LR202',
        'units_lec' => 2,
        'units_lab' => 1,
        'total_units' => 3,
        'raw_payload_json' => ['subject_description' => 'Mobile Development'],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.terms.faculty-loads.items.update-status', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
            'item' => $item->id,
        ]), [
            'status' => 'RETURNED',
            'remarks' => '',
        ])
        ->assertRedirect(route('admin.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $load->id,
        ]))
        ->assertSessionHasErrors(['remarks']);
});

function makeTermFacultyLoadImportFile(array $rows): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();

    $allRows = [
        ['St. Paul University Philippines'],
        ['Tuguegarao City, Cagayan'],
        [''],
        ['Instructors Load'],
        ['Period', 'First Semester, AY 2025-2026'],
        ['Inst', 'Dr. Sheena Gumarang'],
        [''],
        ['Code', 'Section', 'Subject Code', 'Subject Description', 'Units', 'Load Units', 'Lec Units', 'Lab Units', 'Hours', 'Schedule', 'Room', 'Merged To', 'Spe- cial', 'Peti- tioned', 'Dis- solved', 'Size'],
        ...$rows,
    ];

    foreach ($allRows as $rowIndex => $rowValues) {
        foreach ($rowValues as $columnIndex => $value) {
            $sheet->setCellValueByColumnAndRow($columnIndex + 1, $rowIndex + 1, $value);
        }
    }

    $temporaryPath = tempnam(sys_get_temp_dir(), 'term-load-import');
    if ($temporaryPath === false) {
        throw new RuntimeException('Unable to create temporary file for term load import test.');
    }

    $xlsxPath = $temporaryPath.'.xlsx';
    if (! rename($temporaryPath, $xlsxPath)) {
        throw new RuntimeException('Unable to prepare temporary XLSX path for term load import test.');
    }

    (new Xlsx($spreadsheet))->save($xlsxPath);

    return new UploadedFile(
        $xlsxPath,
        'term-faculty-load-import.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true,
    );
}
