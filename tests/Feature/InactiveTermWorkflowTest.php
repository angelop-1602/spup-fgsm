<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Models\Role;

function createRoleUser(string $roleName): User
{
    $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

    /** @var User $user */
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

function makeInactiveTermImportFile(): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();

    $rows = [
        ['St. Paul University Philippines'],
        ['Tuguegarao City, Cagayan'],
        [''],
        ['Instructors Load'],
        ['Period', 'First Semester, AY 2025-2026'],
        ['Inst', 'Sample Faculty'],
        [''],
        ['Code', 'Section', 'Subject Code', 'Subject Description', 'Units', 'Load Units', 'Lec Units', 'Lab Units', 'Hours', 'Schedule', 'Room', 'Merged To', 'Spe- cial', 'Peti- tioned', 'Dis- solved', 'Size'],
        ['T53', 'BSIT 2A', 'ITE 109', 'Advanced Database System', '3', '3', '2', '1', '5', '8-10:30 am TF', 'LR103', '', '', '', '', '26'],
    ];

    foreach ($rows as $rowIndex => $rowValues) {
        foreach ($rowValues as $columnIndex => $value) {
            $sheet->setCellValueByColumnAndRow($columnIndex + 1, $rowIndex + 1, $value);
        }
    }

    $temporaryPath = tempnam(sys_get_temp_dir(), 'inactive-term-import');
    if ($temporaryPath === false) {
        throw new \RuntimeException('Unable to create temporary file for inactive term import test.');
    }

    $xlsxPath = $temporaryPath.'.xlsx';
    if (! rename($temporaryPath, $xlsxPath)) {
        throw new \RuntimeException('Unable to prepare temporary XLSX path for inactive term import test.');
    }

    (new Xlsx($spreadsheet))->save($xlsxPath);

    return new UploadedFile(
        $xlsxPath,
        'inactive-term-import.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true,
    );
}

function createInactiveTermGraph(): array
{
    $department = Department::create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    $faculty = Faculty::create([
        'faculty_code' => 'INACTIVE001',
        'full_name' => 'Inactive Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => 'First Semester',
        'period_code' => '1S-2025-2026',
        'is_active' => false,
    ]);

    $load = FacultyLoad::create([
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

    return compact('department', 'faculty', 'term', 'load', 'item');
}

test('admin import is blocked when a term is inactive', function (): void {
    $admin = createRoleUser('ADMIN');
    ['faculty' => $faculty, 'term' => $term] = createInactiveTermGraph();

    $this->actingAs($admin)
        ->post(route('admin.terms.faculty-loads.import', ['term' => $term->id]), [
            'faculty_id' => $faculty->id,
            'file' => makeInactiveTermImportFile(),
        ])
        ->assertRedirect(route('admin.terms.faculty-loads.show', ['term' => $term->id]))
        ->assertSessionHasErrors(['file']);
});

test('staff import is blocked when a term is inactive', function (): void {
    $staff = createRoleUser('REGISTRAR_STAFF');
    ['faculty' => $faculty, 'term' => $term] = createInactiveTermGraph();

    $this->actingAs($staff)
        ->post(route('staff.terms.faculty-loads.import', ['term' => $term->id]), [
            'faculty_id' => $faculty->id,
            'file' => makeInactiveTermImportFile(),
        ])
        ->assertRedirect(route('staff.terms.faculty-loads.show', ['term' => $term->id]))
        ->assertSessionHasErrors(['file']);
});

test('admin subject status updates are blocked when a term is inactive', function (): void {
    $admin = createRoleUser('ADMIN');
    ['term' => $term, 'load' => $load, 'item' => $item] = createInactiveTermGraph();

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
        ]))
        ->assertSessionHasErrors(['status']);
});

test('staff subject status updates are blocked when a term is inactive', function (): void {
    $staff = createRoleUser('REGISTRAR_STAFF');
    ['term' => $term, 'load' => $load, 'item' => $item] = createInactiveTermGraph();

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
        ]))
        ->assertSessionHasErrors(['status']);
});
