<?php

use App\Models\Department;
use App\Models\Faculty;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Models\Role;

test('admin can import faculties from xlsx', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    /** @var Department $healthDepartment */
    $healthDepartment = Department::query()->create([
        'name' => 'School of Nursing and Allied Health Sciences',
        'code' => 'SNAHS',
    ]);

    /** @var Department $techDepartment */
    $techDepartment = Department::query()->create([
        'name' => 'School of Science Arts and Teacher Education',
        'code' => 'SASTE',
    ]);

    Faculty::query()->create([
        'faculty_code' => 'ACCADC',
        'full_name' => 'Old Name',
        'department_id' => $healthDepartment->id,
        'status' => 'ACTIVE',
    ]);

    $file = makeFacultyImportFile([
        ['1', 'ACCADC', 'Accad, Christine', '', 'C. Accad', '', '', 'accad@example.com', 'Regular', 'Full-time', 'Instructor', 'Dean', 'Main', 'SNAHS', '24', '0'],
        ['2', 'NEWFAC', 'Dela Cruz, Maria', 'P', 'Mia', 'Cagayan', '09171234567', '', 'Regular', 'Part-time', '', '', '', 'SASTE', '18', '0'],
        ['3', 'BADDEPT', 'No Department Faculty', '', '', '', '', '', '', '', '', '', '', 'UNKNOWN', '', '0'],
    ]);

    $response = $this->actingAs($admin)
        ->post(route('admin.faculty.import'), ['file' => $file]);

    $response->assertRedirect(route('admin.faculty.index'));
    $response->assertSessionHas('faculty_import_summary', function (array $summary): bool {
        return $summary['created'] === 1
            && $summary['updated'] === 1
            && $summary['skipped'] === 1
            && is_array($summary['issues']);
    });

    $this->assertDatabaseHas('faculty', [
        'faculty_code' => 'ACCADC',
        'full_name' => 'Accad, Christine',
        'email' => 'accad@example.com',
        'department_id' => $healthDepartment->id,
    ]);

    $this->assertDatabaseHas('faculty', [
        'faculty_code' => 'NEWFAC',
        'full_name' => 'Dela Cruz, Maria',
        'middle_name' => 'P',
        'call_name' => 'Mia',
        'department_id' => $techDepartment->id,
    ]);

    $this->assertDatabaseMissing('faculty', [
        'faculty_code' => 'BADDEPT',
    ]);
});

test('non admin cannot import faculties from xlsx', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    $file = makeFacultyImportFile([
        ['1', 'NOACCESS', 'No Access', '', '', '', '', '', '', '', '', '', '', 'SNAHS', '', '0'],
    ]);

    $this->actingAs($staff)
        ->post(route('admin.faculty.import'), ['file' => $file])
        ->assertForbidden();
});

function makeFacultyImportFile(array $rows): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();

    $allRows = [
        ['St. Paul University Philippines'],
        ['Tuguegarao City, Cagayan'],
        [''],
        ['Instructors'],
        [''],
        ['ID', 'Code', 'Name', 'Middle Name', 'Call Name', 'Address', 'Contact No', 'Email', 'Emp Type', 'Emp Status', 'Rank', 'Supervisor', 'Campus', 'Dept', 'Max Load', 'Disabled'],
        ...$rows,
    ];

    foreach ($allRows as $rowIndex => $rowValues) {
        foreach ($rowValues as $columnIndex => $value) {
            $sheet->setCellValueByColumnAndRow($columnIndex + 1, $rowIndex + 1, $value);
        }
    }

    $temporaryPath = tempnam(sys_get_temp_dir(), 'faculty-import');
    if ($temporaryPath === false) {
        throw new RuntimeException('Unable to create temporary file for faculty import test.');
    }

    $xlsxPath = $temporaryPath.'.xlsx';
    if (! rename($temporaryPath, $xlsxPath)) {
        throw new RuntimeException('Unable to prepare temporary XLSX path for faculty import test.');
    }

    (new Xlsx($spreadsheet))->save($xlsxPath);

    return new UploadedFile(
        $xlsxPath,
        'faculty-import.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true,
    );
}
