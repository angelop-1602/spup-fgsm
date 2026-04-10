<?php

namespace App\Http\Controllers\Staff;

use App\Enums\FacultyLoadStatus;
use App\Models\FacultyLoadItem;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Support\Reports\InteractsWithFacultyReports;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ReportController extends Controller
{
    use InteractsWithFacultyReports;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $terms = Term::query()
            ->orderByDesc('academic_year')
            ->orderBy('term_name')
            ->get(['id', 'academic_year', 'term_name', 'period_code']);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $faculties = $this->reportFacultyOptions();
        $context = $this->normalizeReportContext($request->string('context', 'term')->toString());

        $filters = [
            'term_id' => $request->integer('term_id'),
            'faculty_id' => $request->integer('faculty_id'),
            'department_id' => $request->integer('department_id'),
            'status' => $request->string('status')->toString(),
            'emp_status' => $request->string('emp_status')->toString(),
            'context' => $context,
        ];

        if ($context === 'faculty') {
            $loads = $this->facultyPreviewItems($filters['faculty_id']);
        } elseif (! $filters['term_id']) {
            $loads = FacultyLoad::query()
                ->whereRaw('1 = 0')
                ->paginate(15)
                ->withQueryString();
        } else {
            $query = $this->facultyLoadReportQuery()
                ->where('term_id', $filters['term_id'])
                ->orderByDesc('created_at');

            if ($filters['department_id']) {
                $query->where('department_id', $filters['department_id']);
            }

            if ($filters['context'] === 'clearance') {
                $query->whereIn('status', [
                    FacultyLoadStatus::SUBMITTED->value,
                    FacultyLoadStatus::CLEARED->value,
                ])->orderByRaw(
                    'case when status = ? then 0 when status = ? then 1 else 2 end',
                    [FacultyLoadStatus::SUBMITTED->value, FacultyLoadStatus::CLEARED->value],
                );

                if (in_array($filters['status'], [
                    FacultyLoadStatus::SUBMITTED->value,
                    FacultyLoadStatus::CLEARED->value,
                ], true)) {
                    $query->where('status', $filters['status']);
                }
            } elseif ($filters['status']) {
                $query->where('status', $filters['status']);
            }

            $this->applyEmpStatusFilter($query, $filters['emp_status']);

            $loads = $query->paginate(15)->withQueryString();
            $this->hydrateTotalUnits($loads->getCollection());
        }

        $selectedFaculty = $filters['faculty_id']
            ? $faculties->firstWhere('id', $filters['faculty_id'])
            : null;

        return Inertia::render('Staff/Reports/Index', [
            'loads' => $loads,
            'terms' => $terms,
            'departments' => $departments,
            'faculties' => $faculties->map(fn ($faculty): array => [
                'id' => $faculty->id,
                'faculty_code' => $faculty->faculty_code,
                'full_name' => $faculty->full_name,
                'middle_name' => $faculty->middle_name,
                'emp_status' => $faculty->emp_status,
                'department' => $faculty->department?->only(['id', 'name']),
            ])->values(),
            'selectedFaculty' => $selectedFaculty ? [
                'id' => $selectedFaculty->id,
                'faculty_code' => $selectedFaculty->faculty_code,
                'full_name' => $selectedFaculty->full_name,
                'middle_name' => $selectedFaculty->middle_name,
                'emp_status' => $selectedFaculty->emp_status,
                'department' => $selectedFaculty->department?->only(['id', 'name']),
            ] : null,
            'filters' => $filters,
        ]);
    }

    public function export(Request $request): SymfonyResponse
    {
        $this->authorize('viewAny', Term::class);

        $context = $this->normalizeReportContext($request->string('context', 'term')->toString());
        $filters = [
            'term_id' => $request->integer('term_id'),
            'faculty_id' => $request->integer('faculty_id'),
            'department_id' => $request->integer('department_id'),
            'status' => $request->string('status')->toString(),
            'emp_status' => $request->string('emp_status')->toString(),
            'format' => $request->string('format', 'xlsx')->toString(),
            'context' => $context,
        ];

        if ($context === 'faculty' && ! $filters['faculty_id']) {
            return redirect()
                ->route('staff.reports.index')
                ->withErrors([
                    'faculty_id' => 'Select a faculty before exporting.',
                ]);
        }

        if ($context !== 'faculty' && ! $filters['term_id']) {
            return redirect()
                ->route('staff.reports.index')
                ->withErrors([
                    'term_id' => 'Select a term before exporting.',
                ]);
        }

        if ($filters['format'] === 'pdf') {
            if ($context === 'faculty') {
                return redirect()->route('staff.reports.faculty-export-pdf', [
                    'faculty' => $filters['faculty_id'],
                ]);
            }

            $params = array_filter([
                'context' => $filters['context'],
                'department_id' => $filters['department_id'] ?: null,
                'status' => $filters['status'] ?: null,
                'emp_status' => $filters['emp_status'] ?: null,
            ], fn ($value) => $value !== null && $value !== '');

            return redirect()->route('staff.reports.export-pdf', [
                'term' => $filters['term_id'],
                ...$params,
            ]);
        }

        if ($context === 'faculty') {
            $items = $this->facultyPendingItemsQuery($filters['faculty_id'])->get();

            $rows = $items->map(fn (FacultyLoadItem $item): array => [
                $item->facultyLoad?->term?->period_code ?? '',
                $item->facultyLoad?->term?->academic_year ?? '',
                $this->itemSubjectCode($item),
                number_format((float) ($this->itemUnits($item) ?? 0.0), 2),
                $this->exportItemStatusLabel($item->status),
            ]);

            $filename = 'faculty-unsubmitted-report-'.now()->format('Y-m-d-His').'.xlsx';

            return Excel::download(
                $this->collectionExport(
                    ['Term', 'Academic Year', 'Subject', 'Units', 'Status'],
                    $rows
                ),
                $filename,
                ExcelFormat::XLSX,
            );
        }

        $query = $this->facultyLoadReportQuery()
            ->where('term_id', $filters['term_id'])
            ->orderByDesc('created_at');

        if ($filters['department_id']) {
            $query->where('department_id', $filters['department_id']);
        }

        if ($context === 'clearance') {
            $query->whereIn('status', [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ])->orderByRaw(
                'case when status = ? then 0 when status = ? then 1 else 2 end',
                [FacultyLoadStatus::SUBMITTED->value, FacultyLoadStatus::CLEARED->value],
            );

            if (in_array($filters['status'], [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ], true)) {
                $query->where('status', $filters['status']);
            }
        } elseif ($filters['status']) {
            $query->where('status', $filters['status']);
        }

        $this->applyEmpStatusFilter($query, $filters['emp_status']);

        $loads = $query->get();
        $this->hydrateTotalUnits($loads);

        $rows = $loads->map(fn (FacultyLoad $load): array => [
            $this->facultyDisplayName($load->faculty),
            $load->department?->name ?? '',
            $this->subjectUnitsSummary($load),
            $load->total_units_sum !== null ? number_format((float) $load->total_units_sum, 2) : '',
            $this->exportStatusLabel($context, $load->status),
            $load->faculty?->emp_status ?? '',
        ]);

        $filename = $context === 'clearance'
            ? 'clearance-report-'.now()->format('Y-m-d-His').'.xlsx'
            : 'faculty-loads-report-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(
            $this->collectionExport(
                ['Faculty Name', 'Department', 'Subjects', 'Total Units', 'Status', 'Emp Status'],
                $rows
            ),
            $filename,
            ExcelFormat::XLSX,
        );
    }

    /**
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator<int, array<string, mixed>>
     */
    private function facultyPreviewItems(?int $facultyId)
    {
        if (! $facultyId) {
            return FacultyLoad::query()
                ->whereRaw('1 = 0')
                ->paginate(15)
                ->withQueryString();
        }

        $items = $this->facultyPendingItemsQuery($facultyId)
            ->paginate(15)
            ->withQueryString();

        $items->setCollection(
            $items->getCollection()->map(function (FacultyLoadItem $item): array {
                $term = $item->facultyLoad?->term;

                return [
                    'id' => (int) $item->id,
                    'status' => (string) ($item->status?->value ?? $item->status),
                    'term' => [
                        'id' => (int) ($term?->id ?? 0),
                        'academic_year' => (string) ($term?->academic_year ?? ''),
                        'term_name' => (string) ($term?->term_name ?? ''),
                        'period_code' => (string) ($term?->period_code ?? ''),
                    ],
                    'faculty' => null,
                    'department' => null,
                    'subject_code' => $this->itemSubjectCode($item),
                    'total_units' => $this->itemUnits($item),
                    'section' => $this->itemSection($item),
                ];
            })
        );

        return $items;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<FacultyLoad>
     */
    private function facultyHistoryQuery(int $facultyId)
    {
        return $this->facultyLoadReportQuery()
            ->select('faculty_loads.*')
            ->join('terms', 'terms.id', '=', 'faculty_loads.term_id')
            ->where('faculty_loads.faculty_id', $facultyId)
            ->whereIn('faculty_loads.status', [
                FacultyLoadStatus::PENDING->value,
                FacultyLoadStatus::FOR_REVISION->value,
            ])
            ->orderByDesc('terms.year_start')
            ->orderByDesc('terms.year_end')
            ->orderByDesc('terms.period_code')
            ->orderByDesc('faculty_loads.id');
    }

    /**
     * @param  array<int, string>  $headings
     * @param  \Illuminate\Support\Collection<int, array<int, string|int|float|null>>  $rows
     */
    private function collectionExport(array $headings, $rows): object
    {
        return new class($headings, $rows) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings
        {
            public function __construct(
                private array $headings,
                private $rows,
            ) {}

            public function collection()
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return $this->headings;
            }
        };
    }
}
