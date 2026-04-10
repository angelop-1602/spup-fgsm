<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FacultyStoreRequest;
use App\Http\Requests\Admin\FacultyUpdateRequest;
use App\Models\Department;
use App\Models\Faculty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;

class FacultyController extends Controller
{
    /**
     * @var array<string, list<string>>
     */
    private const IMPORT_HEADER_ALIASES = [
        'code' => ['code'],
        'name' => ['name'],
        'middle_name' => ['middle name'],
        'call_name' => ['call name'],
        'contact_no' => ['contact no', 'contact no.', 'contact number'],
        'email' => ['email'],
        'emp_type' => ['emp type', 'employment type'],
        'emp_status' => ['emp status', 'employment status'],
        'supervisor' => ['supervisor'],
        'dept' => ['dept', 'department'],
    ];

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Faculty::class);

        $search = (string) $request->input('q', '');
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 10;
        }

        $query = Faculty::query()
            ->with('department')
            ->orderBy('full_name');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('faculty_code', 'like', '%'.$search.'%')
                    ->orWhere('full_name', 'like', '%'.$search.'%');
            });
        }

        $faculty = $query
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/Faculty/Index', [
            'faculty' => $faculty,
            'filters' => [
                'q' => $search,
                'per_page' => $perPage,
            ],
            'importSummary' => $request->session()->get('faculty_import_summary'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $this->authorize('create', Faculty::class);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Faculty/Create', [
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(FacultyStoreRequest $request): RedirectResponse
    {
        $this->authorize('create', Faculty::class);

        Faculty::query()->create($request->validated());

        return redirect()
            ->route('admin.faculty.index')
            ->with('success', 'Faculty member created successfully.');
    }

    /**
     * Import faculty rows from an XLSX file.
     */
    public function import(Request $request): RedirectResponse
    {
        $this->authorize('create', Faculty::class);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        $spreadsheet = IOFactory::load($validated['file']->getRealPath());
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        [$headerRowIndex, $headerMap] = $this->resolveHeaderRow($rows);

        if ($headerRowIndex === null) {
            return redirect()
                ->route('admin.faculty.index')
                ->withErrors([
                    'file' => 'Unable to find the header row. Required columns: Code, Name, Dept.',
                ]);
        }

        [$departmentsByCode, $departmentsByName] = $this->buildDepartmentLookups(
            Department::query()->get(['id', 'name', 'code'])
        );

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $issues = [];

        foreach ($rows as $rowIndex => $row) {
            if ($rowIndex <= $headerRowIndex || $this->rowIsEmpty($row)) {
                continue;
            }

            $sheetRow = $rowIndex + 1;
            $facultyCode = $this->getRowValue($row, $headerMap, 'code');
            $fullName = $this->getRowValue($row, $headerMap, 'name');
            $deptValue = $this->getRowValue($row, $headerMap, 'dept');

            if ($facultyCode === '' || $fullName === '') {
                $skipped++;
                $issues[] = "Row {$sheetRow}: missing Code or Name.";

                continue;
            }

            $departmentId = $this->resolveDepartmentId($deptValue, $departmentsByCode, $departmentsByName);

            if ($departmentId === null) {
                $skipped++;
                $issues[] = $deptValue === ''
                    ? "Row {$sheetRow}: missing Dept."
                    : "Row {$sheetRow}: Dept \"{$deptValue}\" not found.";

                continue;
            }

            $empStatus = $this->getRowValue($row, $headerMap, 'emp_status');

            $payload = [
                'faculty_code' => $facultyCode,
                'full_name' => $fullName,
                'middle_name' => $this->nullableString($this->getRowValue($row, $headerMap, 'middle_name')),
                'call_name' => $this->nullableString($this->getRowValue($row, $headerMap, 'call_name')),
                'contact_no' => $this->nullableString($this->getRowValue($row, $headerMap, 'contact_no')),
                'email' => $this->nullableString($this->getRowValue($row, $headerMap, 'email')),
                'emp_type' => $this->nullableString($this->getRowValue($row, $headerMap, 'emp_type')),
                'emp_status' => $this->nullableString($empStatus),
                'supervisor' => $this->nullableString($this->getRowValue($row, $headerMap, 'supervisor')),
                'department_id' => $departmentId,
                'status' => $this->deriveFacultyStatus($empStatus),
            ];

            $faculty = Faculty::query()->where('faculty_code', $facultyCode)->first();

            if ($faculty instanceof Faculty) {
                $faculty->update($payload);
                $updated++;

                continue;
            }

            Faculty::query()->create($payload);
            $created++;
        }

        return redirect()
            ->route('admin.faculty.index')
            ->with('faculty_import_summary', [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'issues' => array_slice($issues, 0, 10),
                'has_more_issues' => count($issues) > 10,
            ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Faculty $faculty): Response
    {
        $this->authorize('update', $faculty);

        $faculty->load('department');

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Faculty/Edit', [
            'faculty' => $faculty,
            'departments' => $departments,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(FacultyUpdateRequest $request, Faculty $faculty): RedirectResponse
    {
        $this->authorize('update', $faculty);

        $faculty->update($request->validated());

        return redirect()
            ->route('admin.faculty.index')
            ->with('success', 'Faculty member updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Faculty $faculty): RedirectResponse
    {
        $this->authorize('delete', $faculty);

        $faculty->delete();

        return redirect()
            ->route('admin.faculty.index')
            ->with('success', 'Faculty member deleted successfully.');
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
     * @return array{0: int|null, 1: array<string, int>}
     */
    private function resolveHeaderRow(array $rows): array
    {
        foreach ($rows as $rowIndex => $row) {
            $headerMap = [];

            foreach ($row as $columnIndex => $value) {
                $normalized = $this->normalizeHeader((string) ($value ?? ''));

                if ($normalized === '') {
                    continue;
                }

                $headerMap[$normalized] = $columnIndex;
            }

            if (
                $this->hasHeader($headerMap, 'code')
                && $this->hasHeader($headerMap, 'name')
                && $this->hasHeader($headerMap, 'dept')
            ) {
                return [$rowIndex, $headerMap];
            }
        }

        return [null, []];
    }

    /**
     * @param  array<string, int>  $headerMap
     */
    private function hasHeader(array $headerMap, string $field): bool
    {
        foreach (self::IMPORT_HEADER_ALIASES[$field] as $alias) {
            if (array_key_exists($this->normalizeHeader($alias), $headerMap)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, mixed>  $row
     * @param  array<string, int>  $headerMap
     */
    private function getRowValue(array $row, array $headerMap, string $field): string
    {
        foreach (self::IMPORT_HEADER_ALIASES[$field] as $alias) {
            $header = $this->normalizeHeader($alias);

            if (! array_key_exists($header, $headerMap)) {
                continue;
            }

            return trim((string) ($row[$headerMap[$header]] ?? ''));
        }

        return '';
    }

    /**
     * @param  array<int, mixed>  $row
     */
    private function rowIsEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) ($value ?? '')) !== '') {
                return false;
            }
        }

        return true;
    }

    private function normalizeHeader(string $value): string
    {
        $normalized = Str::lower(trim($value));
        $normalized = str_replace('.', '', $normalized);

        return preg_replace('/\s+/', ' ', $normalized) ?? $normalized;
    }

    private function nullableString(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    private function deriveFacultyStatus(string $empStatus): string
    {
        $normalizedEmpStatus = Str::lower(trim($empStatus));

        if ($normalizedEmpStatus !== '' && Str::contains($normalizedEmpStatus, ['inactive', 'disabled'])) {
            return 'INACTIVE';
        }

        return 'ACTIVE';
    }

    /**
     * @param  Collection<int, Department>  $departments
     * @return array{0: array<string, int>, 1: array<string, int>}
     */
    private function buildDepartmentLookups(Collection $departments): array
    {
        $departmentsByCode = [];
        $departmentsByName = [];

        foreach ($departments as $department) {
            $nameKey = Str::upper(trim((string) $department->name));

            if ($nameKey !== '') {
                $departmentsByName[$nameKey] = (int) $department->id;
            }

            $codeKey = Str::upper(trim((string) ($department->code ?? '')));

            if ($codeKey !== '') {
                $departmentsByCode[$codeKey] = (int) $department->id;
            }
        }

        return [$departmentsByCode, $departmentsByName];
    }

    /**
     * @param  array<string, int>  $departmentsByCode
     * @param  array<string, int>  $departmentsByName
     */
    private function resolveDepartmentId(string $deptValue, array $departmentsByCode, array $departmentsByName): ?int
    {
        $normalizedDept = Str::upper(trim($deptValue));

        if ($normalizedDept === '') {
            return null;
        }

        return $departmentsByCode[$normalizedDept]
            ?? $departmentsByName[$normalizedDept]
            ?? null;
    }
}
