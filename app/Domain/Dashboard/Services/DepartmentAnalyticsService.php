<?php

namespace App\Domain\Dashboard\Services;

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class DepartmentAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function buildAnalyticsPayload(?int $requestedTermId): array
    {
        $terms = $this->termsQuery()->get([
            'id',
            'period_code',
            'academic_year',
            'term_name',
            'is_active',
        ]);

        $selectedTerm = $this->resolveSelectedTerm($terms, $requestedTermId);
        $departmentCompletion = $this->departmentCompletion($selectedTerm?->id);
        $departmentEmployment = $this->departmentEmployment($selectedTerm?->id);
        $overallEmployment = $this->overallActiveEmployment();

        $completedLoads = (int) $departmentCompletion->sum('completedCount');
        $notCompletedLoads = (int) $departmentCompletion->sum('notCompletedCount');
        $totalLoads = $completedLoads + $notCompletedLoads;

        $activeFacultyCount = $overallEmployment['activeFacultyCount'];
        $partTimeCount = $overallEmployment['partTimeCount'];
        $fullTimeCount = $overallEmployment['fullTimeCount'];

        return [
            'terms' => $terms
                ->map(fn (Term $term): array => [
                    'id' => $term->id,
                    'period_code' => $term->period_code,
                    'academic_year' => $term->academic_year,
                    'term_name' => $term->term_name,
                    'is_active' => (bool) $term->is_active,
                ])
                ->values()
                ->all(),
            'selectedTermId' => $selectedTerm?->id,
            'summary' => [
                'termsCount' => $terms->count(),
                'completedLoads' => $completedLoads,
                'notCompletedLoads' => $notCompletedLoads,
                'totalLoads' => $totalLoads,
                'overallCompletionRate' => $totalLoads > 0
                    ? round(($completedLoads / $totalLoads) * 100, 2)
                    : 0.0,
                'activeFacultyCount' => $activeFacultyCount,
                'partTimeCount' => $partTimeCount,
                'fullTimeCount' => $fullTimeCount,
            ],
            'departmentCompletion' => $departmentCompletion->values()->all(),
            'departmentEmployment' => $departmentEmployment->values()->all(),
            'overallEmployment' => [
                [
                    'label' => 'Part-time',
                    'value' => $partTimeCount,
                ],
                [
                    'label' => 'Full-time',
                    'value' => $fullTimeCount,
                ],
            ],
        ];
    }

    /**
     * @param  Collection<int, Term>  $terms
     */
    private function resolveSelectedTerm(Collection $terms, ?int $requestedTermId): ?Term
    {
        $selectedTerm = null;

        if ($requestedTermId !== null) {
            $selectedTerm = $terms->firstWhere('id', $requestedTermId);
        }

        if ($selectedTerm === null) {
            $selectedTerm = $terms->firstWhere('is_active', true);
        }

        if ($selectedTerm === null) {
            $selectedTerm = $terms->first();
        }

        return $selectedTerm;
    }

    /**
     * @return Builder<Term>
     */
    private function termsQuery(): Builder
    {
        return Term::query()
            ->orderByDesc('year_start')
            ->orderByDesc('year_end')
            ->orderByDesc('period_code')
            ->orderByDesc('id');
    }

    /**
     * @return Collection<int, array{
     *     departmentId: int,
     *     departmentLabel: string,
     *     completedCount: int,
     *     notCompletedCount: int,
     *     totalLoads: int
     * }>
     */
    private function departmentCompletion(?int $termId): Collection
    {
        $aggregatedLoads = FacultyLoad::query()
            ->select('department_id')
            ->selectRaw(
                'SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) AS completed_count',
                [FacultyLoadStatus::SUBMITTED->value, FacultyLoadStatus::CLEARED->value]
            )
            ->selectRaw(
                'SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) AS not_completed_count',
                [FacultyLoadStatus::PENDING->value, FacultyLoadStatus::FOR_REVISION->value]
            );

        if ($termId !== null) {
            $aggregatedLoads->where('term_id', $termId);
        } else {
            $aggregatedLoads->whereRaw('1 = 0');
        }

        $aggregatedLoads->groupBy('department_id');

        return Department::query()
            ->leftJoinSub($aggregatedLoads, 'load_stats', function ($join): void {
                $join->on('departments.id', '=', 'load_stats.department_id');
            })
            ->orderBy('departments.name')
            ->get([
                'departments.id as department_id',
                'departments.code as department_code',
                'departments.name as department_name',
                \DB::raw('COALESCE(load_stats.completed_count, 0) as completed_count'),
                \DB::raw('COALESCE(load_stats.not_completed_count, 0) as not_completed_count'),
            ])
            ->map(function (object $row): array {
                $completedCount = (int) $row->completed_count;
                $notCompletedCount = (int) $row->not_completed_count;

                return [
                    'departmentId' => (int) $row->department_id,
                    'departmentLabel' => $this->departmentLabel($row->department_code, $row->department_name),
                    'completedCount' => $completedCount,
                    'notCompletedCount' => $notCompletedCount,
                    'totalLoads' => $completedCount + $notCompletedCount,
                ];
            });
    }

    /**
     * @return Collection<int, array{
     *     departmentId: int,
     *     departmentLabel: string,
     *     partTimeCount: int,
     *     fullTimeCount: int,
     *     activeFacultyCount: int
     * }>
     */
    private function departmentEmployment(?int $termId): Collection
    {
        $aggregatedFaculty = FacultyLoad::query()
            ->select('faculty_loads.department_id')
            ->selectRaw('COUNT(DISTINCT faculty_loads.faculty_id) AS active_faculty_count')
            ->selectRaw(
                "COUNT(DISTINCT CASE WHEN LOWER(REPLACE(COALESCE(faculty.emp_status, ''), '-', ' ')) LIKE ? THEN faculty_loads.faculty_id END) AS part_time_count",
                ['%part time%']
            )
            ->join('faculty', 'faculty.id', '=', 'faculty_loads.faculty_id')
            ->whereNotNull('faculty_loads.department_id')
            ->whereNotNull('faculty_loads.faculty_id');

        if ($termId !== null) {
            $aggregatedFaculty->where('faculty_loads.term_id', $termId);
        } else {
            $aggregatedFaculty->whereRaw('1 = 0');
        }

        $aggregatedFaculty->groupBy('faculty_loads.department_id');

        return Department::query()
            ->leftJoinSub($aggregatedFaculty, 'faculty_stats', function ($join): void {
                $join->on('departments.id', '=', 'faculty_stats.department_id');
            })
            ->orderBy('departments.name')
            ->get([
                'departments.id as department_id',
                'departments.code as department_code',
                'departments.name as department_name',
                \DB::raw('COALESCE(faculty_stats.active_faculty_count, 0) as active_faculty_count'),
                \DB::raw('COALESCE(faculty_stats.part_time_count, 0) as part_time_count'),
            ])
            ->map(function (object $row): array {
                $activeFacultyCount = (int) $row->active_faculty_count;
                $partTimeCount = (int) $row->part_time_count;
                $fullTimeCount = max(0, $activeFacultyCount - $partTimeCount);

                return [
                    'departmentId' => (int) $row->department_id,
                    'departmentLabel' => $this->departmentLabel($row->department_code, $row->department_name),
                    'partTimeCount' => $partTimeCount,
                    'fullTimeCount' => $fullTimeCount,
                    'activeFacultyCount' => $activeFacultyCount,
                ];
            });
    }

    /**
     * @return array{activeFacultyCount: int, partTimeCount: int, fullTimeCount: int}
     */
    private function overallActiveEmployment(): array
    {
        $row = Faculty::query()
            ->selectRaw('COUNT(*) AS active_faculty_count')
            ->selectRaw(
                "SUM(CASE WHEN LOWER(REPLACE(COALESCE(emp_status, ''), '-', ' ')) LIKE ? THEN 1 ELSE 0 END) AS part_time_count",
                ['%part time%']
            )
            ->whereRaw("UPPER(COALESCE(status, '')) = ?", ['ACTIVE'])
            ->first();

        $activeFacultyCount = (int) ($row?->active_faculty_count ?? 0);
        $partTimeCount = (int) ($row?->part_time_count ?? 0);

        return [
            'activeFacultyCount' => $activeFacultyCount,
            'partTimeCount' => $partTimeCount,
            'fullTimeCount' => max(0, $activeFacultyCount - $partTimeCount),
        ];
    }

    private function departmentLabel(?string $departmentCode, ?string $departmentName): string
    {
        $code = trim((string) $departmentCode);

        if ($code !== '') {
            return $code;
        }

        return (string) $departmentName;
    }
}
