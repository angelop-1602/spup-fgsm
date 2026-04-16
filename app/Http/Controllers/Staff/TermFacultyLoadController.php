<?php

namespace App\Http\Controllers\Staff;

use App\Domain\AuditLogs\Services\FacultyLoadAuditLogger;
use App\Domain\Terms\Services\TermCompletionService;
use App\Enums\FacultyLoadItemStatus;
use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\FacultyLoadItem;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;

class TermFacultyLoadController extends Controller
{
    /**
     * @var array<string, list<string>>
     */
    private const IMPORT_HEADER_ALIASES = [
        'code' => ['code'],
        'section' => ['section'],
        'subject_code' => ['subject code', 'subjectcode', 'subj code', 'subjcode'],
        'subject_description' => ['subject description', 'description'],
        'units' => ['units'],
        'load_units' => ['load units', 'loadunits'],
        'lec_units' => ['lec units', 'lecunits', 'lecture units', 'lectureunits'],
        'lab_units' => ['lab units', 'labunits'],
        'hours' => ['hours'],
        'schedule' => ['schedule'],
        'room' => ['room'],
        'size' => ['size'],
    ];

    public function __construct(
        private TermCompletionService $termCompletionService,
        private FacultyLoadAuditLogger $auditLogger,
    ) {}

    public function show(Request $request, Term $term): Response
    {
        $this->authorize('view', $term);
        $this->authorize('viewAny', FacultyLoad::class);
        $term->loadCompletionCounts();

        $search = (string) $request->input('q', '');
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 25, 50], true)) {
            $perPage = 10;
        }

        $loadsQuery = FacultyLoad::query()
            ->where('term_id', $term->id)
            ->with([
                'faculty:id,faculty_code,full_name',
                'department:id,name,code',
            ])
            ->withCount([
                'items',
                'items as submitted_items_count' => function ($query): void {
                    $query->where(
                        'status',
                        FacultyLoadItemStatus::SUBMITTED->value,
                    );
                },
                'items as returned_items_count' => function ($query): void {
                    $query->where(
                        'status',
                        FacultyLoadItemStatus::RETURNED->value,
                    );
                },
            ])
            ->orderByDesc('updated_at');

        if ($search !== '') {
            $loadsQuery->where(function ($query) use ($search): void {
                $query->whereHas('faculty', function ($facultyQuery) use ($search): void {
                    $facultyQuery->where('faculty_code', 'like', '%'.$search.'%')
                        ->orWhere('full_name', 'like', '%'.$search.'%');
                })->orWhereHas('department', function ($departmentQuery) use ($search): void {
                    $departmentQuery->where('name', 'like', '%'.$search.'%')
                        ->orWhere('code', 'like', '%'.$search.'%');
                });
            });
        }

        $loads = $loadsQuery->paginate($perPage)->withQueryString();

        $facultyOptions = Faculty::query()
            ->with('department:id,name,code')
            ->orderBy('full_name')
            ->get(['id', 'faculty_code', 'full_name', 'department_id']);

        $assignedFacultyIds = FacultyLoad::query()
            ->where('term_id', $term->id)
            ->whereNotNull('faculty_id')
            ->distinct()
            ->pluck('faculty_id')
            ->map(fn ($facultyId): int => (int) $facultyId)
            ->values();

        return Inertia::render('Staff/Terms/FacultyLoads', [
            'term' => $term->only([
                'id',
                'period_code',
                'term_name',
                'academic_year',
                'is_active',
                'total_loads',
                'completed_loads',
            ]),
            'loads' => $loads,
            'facultyOptions' => $facultyOptions,
            'assignedFacultyIds' => $assignedFacultyIds,
            'filters' => [
                'q' => $search,
                'per_page' => $perPage,
            ],
            'importSummary' => $request->session()->get('term_faculty_load_import_summary'),
        ]);
    }

    public function view(Request $request, Term $term, FacultyLoad $facultyLoad): Response
    {
        $this->authorize('view', $term);
        $this->authorize('view', $facultyLoad);
        $term->loadCompletionCounts();

        if ((int) $facultyLoad->term_id !== (int) $term->id) {
            abort(404);
        }

        $facultyLoad->load([
            'faculty:id,faculty_code,full_name',
            'department:id,name,code',
            'items' => function ($query): void {
                $query->orderBy('id');
            },
        ]);

        return Inertia::render('Staff/Terms/FacultyLoadShow', [
            'term' => $term->only([
                'id',
                'period_code',
                'term_name',
                'academic_year',
                'is_active',
                'total_loads',
                'completed_loads',
            ]),
            'load' => [
                'id' => (int) $facultyLoad->id,
                'status' => (string) ($facultyLoad->status?->value ?? $facultyLoad->status),
                'faculty' => $facultyLoad->faculty?->only([
                    'id',
                    'faculty_code',
                    'full_name',
                ]),
                'department' => $facultyLoad->department?->only([
                    'id',
                    'name',
                    'code',
                ]),
                'items' => $facultyLoad->items->map(function ($item): array {
                    return [
                        'id' => (int) $item->id,
                        'subject_code' => $item->subject_code,
                        'section' => $item->section,
                        'schedule' => $item->schedule,
                        'room' => $item->room,
                        'units_lec' => $item->units_lec,
                        'units_lab' => $item->units_lab,
                        'total_units' => $item->total_units,
                        'status' => (string) ($item->status?->value ?? $item->status),
                        'remarks' => $item->remarks,
                        'raw_payload_json' => $item->raw_payload_json,
                    ];
                })->values()->all(),
            ],
        ]);
    }

    public function updateItemStatus(Request $request, Term $term, FacultyLoad $facultyLoad, FacultyLoadItem $item): RedirectResponse
    {
        $this->authorize('view', $term);
        $this->authorize('update', $facultyLoad);

        if ((int) $facultyLoad->term_id !== (int) $term->id || (int) $item->faculty_load_id !== (int) $facultyLoad->id) {
            abort(404);
        }

        if (! $term->is_active) {
            return redirect()
                ->route('staff.terms.faculty-loads.view', [
                    'term' => $term->id,
                    'facultyLoad' => $facultyLoad->id,
                ])
                ->withErrors([
                    'status' => 'This term is inactive. Activate it before updating subject status.',
                ]);
        }

        $validStatuses = array_map(
            static fn (FacultyLoadItemStatus $status): string => $status->value,
            FacultyLoadItemStatus::cases(),
        );

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in($validStatuses)],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $newStatus = FacultyLoadItemStatus::from((string) $validated['status']);
        $remarks = trim((string) ($validated['remarks'] ?? ''));

        /** @var User|null $actor */
        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(403);
        }

        if ($newStatus === FacultyLoadItemStatus::RETURNED && $remarks === '') {
            return redirect()
                ->route('staff.terms.faculty-loads.view', [
                    'term' => $term->id,
                    'facultyLoad' => $facultyLoad->id,
                ])
                ->withErrors([
                    'remarks' => 'Remarks are required when returning a subject.',
                ]);
        }

        DB::transaction(function () use ($item, $newStatus, $remarks, $facultyLoad, $actor): void {
            $oldItemStatus = (string) ($item->status?->value ?? $item->status);
            $oldLoadStatus = (string) ($facultyLoad->status?->value ?? $facultyLoad->status);

            $item->status = $newStatus;
            $item->remarks = $newStatus === FacultyLoadItemStatus::RETURNED ? $remarks : null;
            $item->save();

            $totalItems = (int) $facultyLoad->items()->count();
            $submittedItems = (int) $facultyLoad->items()
                ->where('status', FacultyLoadItemStatus::SUBMITTED->value)
                ->count();
            $returnedItems = (int) $facultyLoad->items()
                ->where('status', FacultyLoadItemStatus::RETURNED->value)
                ->count();

            if ($totalItems > 0 && $submittedItems === $totalItems) {
                $facultyLoad->status = FacultyLoadStatus::SUBMITTED;
                $facultyLoad->checked_at = now();
                $facultyLoad->checked_by_user_id = $actor->id;
            } elseif ($returnedItems > 0) {
                $facultyLoad->status = FacultyLoadStatus::FOR_REVISION;
                $facultyLoad->checked_at = now();
                $facultyLoad->checked_by_user_id = $actor->id;
            } else {
                $facultyLoad->status = FacultyLoadStatus::PENDING;
                $facultyLoad->checked_at = null;
                $facultyLoad->checked_by_user_id = null;
            }

            $facultyLoad->save();

            $newLoadStatus = (string) ($facultyLoad->status?->value ?? $facultyLoad->status);

            $this->auditLogger->logItemStatusUpdated(
                load: $facultyLoad,
                item: $item,
                actor: $actor,
                oldItemStatus: $oldItemStatus === '' ? null : $oldItemStatus,
                newItemStatus: $newStatus->value,
                oldLoadStatus: $oldLoadStatus === '' ? null : $oldLoadStatus,
                newLoadStatus: $newLoadStatus === '' ? null : $newLoadStatus,
                remarks: $item->remarks,
            );
        });

        $term->refresh();
        $this->termCompletionService->recalculate($term, $actor);

        return redirect()->route('staff.terms.faculty-loads.view', [
            'term' => $term->id,
            'facultyLoad' => $facultyLoad->id,
        ]);
    }

    public function import(Request $request, Term $term): RedirectResponse
    {
        $this->authorize('create', FacultyLoad::class);

        if (! $term->is_active) {
            return redirect()
                ->route('staff.terms.faculty-loads.show', $term)
                ->withErrors([
                    'file' => 'This term is inactive. Activate it before importing faculty loads.',
                ]);
        }

        $validated = $request->validate([
            'faculty_id' => ['required', 'integer', 'exists:faculty,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        $faculty = Faculty::query()
            ->select(['id', 'department_id'])
            ->findOrFail((int) $validated['faculty_id']);

        $spreadsheet = IOFactory::load($validated['file']->getRealPath());
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        [$headerRowIndex, $headerMap] = $this->resolveHeaderRow($rows);

        if ($headerRowIndex === null) {
            return redirect()
                ->route('staff.terms.faculty-loads.show', $term)
                ->withErrors([
                    'file' => 'Unable to find the load header row. Required columns: Section and Subject Code.',
                ]);
        }

        $subjectIdsByCode = Subject::query()
            ->get(['id', 'code'])
            ->mapWithKeys(function (Subject $subject): array {
                $key = Str::upper(trim((string) $subject->code));

                return $key === '' ? [] : [$key => $subject->id];
            })
            ->all();

        $itemsPayload = [];
        $skippedRows = 0;
        $issues = [];

        foreach ($rows as $rowIndex => $row) {
            if ($rowIndex <= $headerRowIndex || $this->rowIsEmpty($row)) {
                continue;
            }

            $sheetRow = $rowIndex + 1;

            $legacyCode = $this->getRowValue($row, $headerMap, 'code');
            $section = $this->getRowValue($row, $headerMap, 'section');
            $subjectCode = $this->getRowValue($row, $headerMap, 'subject_code');

            if ($subjectCode === '' && $legacyCode !== '') {
                $subjectCode = $legacyCode;
            }

            if ($subjectCode === '' && $section === '' && $legacyCode === '') {
                $skippedRows++;

                continue;
            }

            if ($subjectCode === '' && $section === '') {
                $skippedRows++;
                $issues[] = "Row {$sheetRow}: missing Section and Subject Code.";

                continue;
            }

            $units = $this->toNullableDecimal($this->getRowValue($row, $headerMap, 'units'));
            $loadUnits = $this->toNullableDecimal($this->getRowValue($row, $headerMap, 'load_units'));
            $lecUnits = $this->toNullableDecimal($this->getRowValue($row, $headerMap, 'lec_units'));
            $labUnits = $this->toNullableDecimal($this->getRowValue($row, $headerMap, 'lab_units'));

            $totalUnits = $loadUnits ?? $units;

            if ($totalUnits === null && ($lecUnits !== null || $labUnits !== null)) {
                $totalUnits = (float) (($lecUnits ?? 0) + ($labUnits ?? 0));
            }

            $subjectKey = Str::upper(trim($subjectCode));
            $subjectId = $subjectKey !== '' ? ($subjectIdsByCode[$subjectKey] ?? null) : null;

            $itemsPayload[] = [
                'subject_id' => $subjectId,
                'subject_code' => $this->nullableString($subjectCode),
                'section' => $this->nullableString($section),
                'schedule' => $this->nullableString($this->getRowValue($row, $headerMap, 'schedule')),
                'room' => $this->nullableString($this->getRowValue($row, $headerMap, 'room')),
                'units_lec' => $lecUnits,
                'units_lab' => $labUnits,
                'total_units' => $totalUnits,
                'status' => FacultyLoadItemStatus::PENDING,
                'remarks' => null,
                'raw_payload_json' => [
                    'sheet_row' => $sheetRow,
                    'code' => $this->nullableString($legacyCode),
                    'section' => $this->nullableString($section),
                    'subject_code' => $this->nullableString($subjectCode),
                    'subject_description' => $this->nullableString($this->getRowValue($row, $headerMap, 'subject_description')),
                    'units' => $units,
                    'load_units' => $loadUnits,
                    'lec_units' => $lecUnits,
                    'lab_units' => $labUnits,
                    'hours' => $this->nullableString($this->getRowValue($row, $headerMap, 'hours')),
                    'schedule' => $this->nullableString($this->getRowValue($row, $headerMap, 'schedule')),
                    'room' => $this->nullableString($this->getRowValue($row, $headerMap, 'room')),
                    'size' => $this->nullableString($this->getRowValue($row, $headerMap, 'size')),
                ],
            ];
        }

        if ($itemsPayload === []) {
            return redirect()
                ->route('staff.terms.faculty-loads.show', $term)
                ->withErrors([
                    'file' => 'No valid load rows were found below the header row.',
                ]);
        }

        /** @var User|null $actor */
        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(403);
        }

        $departmentId = $faculty->department_id !== null ? (int) $faculty->department_id : null;

        $existingLoadQuery = FacultyLoad::query()
            ->where('term_id', (int) $term->id)
            ->where('faculty_id', (int) $validated['faculty_id']);

        $existingLoad = $departmentId !== null
            ? (clone $existingLoadQuery)->where('department_id', $departmentId)->first()
            : (clone $existingLoadQuery)->whereNull('department_id')->first();

        if (! $existingLoad instanceof FacultyLoad) {
            $existingLoad = $existingLoadQuery->orderByDesc('id')->first();
        }

        $existingLoadStatus = $existingLoad instanceof FacultyLoad
            ? (string) ($existingLoad->status?->value ?? $existingLoad->status)
            : null;
        $replacedRows = $existingLoad instanceof FacultyLoad
            ? (int) $existingLoad->items()->count()
            : 0;
        $fileName = (string) $validated['file']->getClientOriginalName();

        DB::transaction(function () use ($existingLoad, $term, $validated, $departmentId, $actor, $itemsPayload, $existingLoadStatus, $replacedRows, $skippedRows, $headerRowIndex, $fileName): void {
            $load = $existingLoad ?? new FacultyLoad([
                'term_id' => (int) $term->id,
                'faculty_id' => (int) $validated['faculty_id'],
            ]);

            $load->department_id = $departmentId;
            $load->status = FacultyLoadStatus::PENDING;
            $load->received_at = now();
            $load->received_by_user_id = $actor->id;
            $load->checked_at = null;
            $load->checked_by_user_id = null;
            $load->remarks = null;
            $load->save();

            $load->items()->delete();
            $load->items()->createMany($itemsPayload);

            $this->auditLogger->logImport(
                load: $load,
                actor: $actor,
                isUpdate: $existingLoad instanceof FacultyLoad,
                oldLoadStatus: $existingLoadStatus,
                importedRows: count($itemsPayload),
                skippedRows: $skippedRows,
                headerRow: $headerRowIndex + 1,
                replacedRows: $replacedRows,
                fileName: $fileName,
            );
        });

        $term->refresh();
        $this->termCompletionService->recalculate($term, $actor);

        return redirect()
            ->route('staff.terms.faculty-loads.show', $term)
            ->with('term_faculty_load_import_summary', [
                'action' => $existingLoad instanceof FacultyLoad ? 'updated' : 'created',
                'imported_rows' => count($itemsPayload),
                'skipped_rows' => $skippedRows,
                'header_row' => $headerRowIndex + 1,
                'issues' => array_slice($issues, 0, 10),
                'has_more_issues' => count($issues) > 10,
            ]);
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

            if ($this->hasHeader($headerMap, 'section') && $this->hasHeader($headerMap, 'subject_code')) {
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
        $normalized = preg_replace('/[^a-z0-9]+/', '', $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function nullableString(string $value): ?string
    {
        return trim($value) === '' ? null : trim($value);
    }

    private function toNullableDecimal(string $value): ?float
    {
        $normalized = str_replace(',', '', trim($value));

        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return round((float) $normalized, 2);
    }
}
