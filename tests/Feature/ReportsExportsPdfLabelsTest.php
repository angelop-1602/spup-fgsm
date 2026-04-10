<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\FacultyLoadItem;
use App\Models\Term;

test('term PDF view labels pending as unsubmitted', function (): void {
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

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

    $faculty = Faculty::query()->create([
        'faculty_code' => 'PEND001',
        'full_name' => 'Pending Faculty',
        'middle_name' => 'Q.',
        'emp_status' => 'Full-time',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $load = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    FacultyLoadItem::query()->create([
        'faculty_load_id' => $load->id,
        'subject_code' => 'MATH101',
        'total_units' => 3,
        'raw_payload_json' => [],
    ]);
    FacultyLoadItem::query()->create([
        'faculty_load_id' => $load->id,
        'subject_code' => 'ENG102',
        'total_units' => 2,
        'raw_payload_json' => [],
    ]);

    $load = $load->load(['faculty', 'department', 'term', 'items']);
    $load->setAttribute('total_units_sum', 5.0);

    $html = view('exports.clearance_loads', [
        'term' => $term,
        'loads' => collect([$load]),
        'preparedBy' => 'Test User',
        'registrarName' => 'Registrar',
        'showConfirmedBy' => true,
        'reportTitle' => 'Test Term Report',
        'statusMode' => 'term',
    ])->render();

    expect($html)->toContain('Unsubmitted');
    expect($html)->toContain('MATH101 (3.00)');
    expect($html)->toContain('ENG102 (2.00)');
});

test('clearance PDF view labels submitted as uncleared', function (): void {
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

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

    $faculty = Faculty::query()->create([
        'faculty_code' => 'SUBM001',
        'full_name' => 'Submitted Faculty',
        'emp_status' => 'Part time',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $load = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoadItem::query()->create([
        'faculty_load_id' => $load->id,
        'subject_code' => 'SCI201',
        'total_units' => 3,
        'raw_payload_json' => [],
    ]);

    $load = $load->load(['faculty', 'department', 'term', 'items']);
    $load->setAttribute('total_units_sum', 3.0);

    $html = view('exports.clearance_loads', [
        'term' => $term,
        'loads' => collect([$load]),
        'preparedBy' => 'Test User',
        'registrarName' => 'Registrar',
        'showConfirmedBy' => true,
        'reportTitle' => 'Test Clearance Report',
        'statusMode' => 'clearance',
    ])->render();

    expect($html)->toContain('Uncleared');
    expect($html)->toContain('SCI201 (3.00)');
});

test('per-faculty PDF view lists pending and returned subjects individually', function (): void {
    $department = Department::query()->create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

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

    $secondTerm = Term::query()->create([
        'school_unit' => 'COLLEGE',
        'year_start' => 2025,
        'year_end' => 2026,
        'academic_year' => '2025-2026',
        'term_name' => 'Second Semester',
        'period_code' => '2S-2025-2026',
        'display_code' => 'Second Semester, AY 2025-2026',
        'is_active' => false,
    ]);

    $faculty = Faculty::query()->create([
        'faculty_code' => 'FAC001',
        'full_name' => 'Faculty Member',
        'emp_status' => 'Part-time',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ])->load('department');

    $pendingLoad = FacultyLoad::query()->create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);
    FacultyLoadItem::query()->create([
        'faculty_load_id' => $pendingLoad->id,
        'subject_code' => 'HIST100',
        'total_units' => 3,
        'status' => 'PENDING',
        'raw_payload_json' => [],
    ]);
    $pendingLoad = $pendingLoad->load(['term', 'items']);
    $pendingLoad->setAttribute('total_units_sum', 6.0);

    $revisionLoad = FacultyLoad::query()->create([
        'term_id' => $secondTerm->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::FOR_REVISION,
    ]);
    FacultyLoadItem::query()->create([
        'faculty_load_id' => $revisionLoad->id,
        'subject_code' => 'HIST100',
        'total_units' => 1,
        'status' => 'RETURNED',
        'raw_payload_json' => [],
    ]);
    FacultyLoadItem::query()->create([
        'faculty_load_id' => $revisionLoad->id,
        'subject_code' => 'CHEM110',
        'total_units' => 3,
        'status' => 'PENDING',
        'raw_payload_json' => [],
    ]);
    $items = FacultyLoadItem::query()
        ->whereIn('faculty_load_id', [$pendingLoad->id, $revisionLoad->id])
        ->with(['facultyLoad.term'])
        ->orderBy('id')
        ->get();

    $html = view('exports.faculty_unsubmitted', [
        'faculty' => $faculty,
        'items' => $items,
        'preparedBy' => 'Test User',
        'registrarName' => 'Registrar',
        'showConfirmedBy' => true,
        'reportTitle' => 'Test Faculty Unsubmitted Report',
    ])->render();

    expect($html)
        ->toContain('Faculty Member')
        ->toContain('School of Information Technology and Engineering')
        ->toContain('Unsubmitted');
    expect($html)->toContain('HIST100');
    expect($html)->toContain('CHEM110');
    expect($html)->toContain('Returned');
});

