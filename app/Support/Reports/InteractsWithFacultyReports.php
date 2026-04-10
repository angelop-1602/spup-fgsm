<?php

namespace App\Support\Reports;

use App\Enums\FacultyLoadStatus;
use App\Enums\FacultyLoadItemStatus;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\FacultyLoadItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

trait InteractsWithFacultyReports
{
    protected function normalizeReportContext(string $context): string
    {
        return in_array($context, ['term', 'clearance', 'faculty'], true)
            ? $context
            : 'term';
    }

    /**
     * @return Builder<FacultyLoad>
     */
    protected function facultyLoadReportQuery(): Builder
    {
        return FacultyLoad::query()
            ->with([
                'term',
                'faculty:id,faculty_code,full_name,middle_name,emp_status,department_id',
                'faculty.department:id,name',
                'department:id,name,code',
                'items:id,faculty_load_id,subject_id,subject_code,total_units,units_lec,units_lab,raw_payload_json',
                'items.subject:id,code',
            ])
            ->withCount('items')
            ->withSum('items as total_units_sum', 'total_units');
    }

    /**
     * @return Builder<FacultyLoadItem>
     */
    protected function facultyPendingItemsQuery(int $facultyId): Builder
    {
        return FacultyLoadItem::query()
            ->select('faculty_load_items.*')
            ->join('faculty_loads', 'faculty_loads.id', '=', 'faculty_load_items.faculty_load_id')
            ->join('terms', 'terms.id', '=', 'faculty_loads.term_id')
            ->with([
                'subject:id,code',
                'facultyLoad.term:id,academic_year,term_name,period_code,year_start,year_end',
            ])
            ->where('faculty_loads.faculty_id', $facultyId)
            ->whereIn('faculty_load_items.status', [
                FacultyLoadItemStatus::PENDING->value,
                FacultyLoadItemStatus::RETURNED->value,
            ])
            ->orderByDesc('terms.year_start')
            ->orderByDesc('terms.year_end')
            ->orderByDesc('terms.period_code')
            ->orderByDesc('faculty_load_items.id');
    }

    protected function itemUnits(FacultyLoadItem $item): ?float
    {
        $value = $item->total_units;

        if ($value !== null) {
            return (float) $value;
        }

        $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
        $rawValue = $raw['load_units'] ?? $raw['units'] ?? null;

        if ($rawValue !== null && is_numeric(str_replace(',', '', (string) $rawValue))) {
            return (float) str_replace(',', '', (string) $rawValue);
        }

        $lec = is_numeric($item->units_lec ?? null) ? (float) $item->units_lec : 0.0;
        $lab = is_numeric($item->units_lab ?? null) ? (float) $item->units_lab : 0.0;

        return $lec + $lab;
    }

    protected function itemSubjectCode(FacultyLoadItem $item): string
    {
        $code = trim((string) ($item->subject?->code ?? $item->subject_code ?? ''));

        if ($code !== '') {
            return $code;
        }

        $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
        $code = trim((string) ($raw['subject_code'] ?? $raw['subject'] ?? $raw['course_code'] ?? ''));

        return $code !== '' ? $code : 'Unknown';
    }

    protected function itemSection(FacultyLoadItem $item): string
    {
        $section = trim((string) ($item->section ?? ''));

        if ($section !== '') {
            return $section;
        }

        $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
        $section = trim((string) ($raw['section'] ?? ''));

        return $section;
    }

    protected function exportItemStatusLabel(FacultyLoadItemStatus|string|null $status): string
    {
        $rawStatus = is_string($status) ? $status : $status?->value;
        $rawStatus = strtoupper(trim((string) $rawStatus));

        return $rawStatus === FacultyLoadItemStatus::PENDING->value
            ? 'Unsubmitted'
            : $this->humanizeStatus($rawStatus);
    }

    protected function subjectUnitsSummary(FacultyLoad $load): string
    {
        if (! $load->relationLoaded('items')) {
            return '';
        }

        /** @var array<string, float> $totals */
        $totals = [];

        foreach ($load->items as $item) {
            $subjectCode = trim((string) ($item->subject?->code ?? $item->subject_code ?? ''));

            if ($subjectCode === '') {
                $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                $subjectCode = trim((string) ($raw['subject_code'] ?? $raw['subject'] ?? $raw['course_code'] ?? ''));
            }

            if ($subjectCode === '') {
                $subjectCode = 'Unknown';
            }

            $value = $item->total_units;

            if ($value === null) {
                $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                $rawValue = $raw['load_units'] ?? $raw['units'] ?? null;

                if ($rawValue !== null && is_numeric(str_replace(',', '', (string) $rawValue))) {
                    $value = (float) str_replace(',', '', (string) $rawValue);
                } else {
                    $lec = is_numeric($item->units_lec ?? null) ? (float) $item->units_lec : 0.0;
                    $lab = is_numeric($item->units_lab ?? null) ? (float) $item->units_lab : 0.0;
                    $value = $lec + $lab;
                }
            }

            $totals[$subjectCode] = ($totals[$subjectCode] ?? 0.0) + (float) $value;
        }

        ksort($totals);

        return collect($totals)
            ->map(fn (float $units, string $code): string => $code.' ('.number_format($units, 2).')')
            ->implode(', ');
    }

    /**
     * @return Collection<int, Faculty>
     */
    protected function reportFacultyOptions(): Collection
    {
        return Faculty::query()
            ->with('department:id,name')
            ->orderBy('full_name')
            ->orderBy('faculty_code')
            ->get([
                'id',
                'faculty_code',
                'full_name',
                'middle_name',
                'emp_status',
                'department_id',
            ]);
    }

    /**
     * @param  Builder<FacultyLoad>  $query
     */
    protected function applyEmpStatusFilter(Builder $query, ?string $empStatus): void
    {
        if ($empStatus === 'part-time') {
            $query->whereHas('faculty', function (Builder $facultyQuery): void {
                $facultyQuery->whereRaw(
                    "LOWER(REPLACE(COALESCE(emp_status, ''), '-', ' ')) LIKE ?",
                    ['%part time%']
                );
            });

            return;
        }

        if ($empStatus !== 'full-time') {
            return;
        }

        $query->whereHas('faculty', function (Builder $facultyQuery): void {
            $facultyQuery
                ->whereRaw("TRIM(COALESCE(emp_status, '')) <> ''")
                ->whereRaw(
                    "LOWER(REPLACE(COALESCE(emp_status, ''), '-', ' ')) NOT LIKE ?",
                    ['%part time%']
                );
        });
    }

    /**
     * @param  iterable<FacultyLoad>  $loads
     */
    protected function hydrateTotalUnits(iterable $loads): void
    {
        foreach ($loads as $load) {
            if ($load->total_units_sum !== null) {
                continue;
            }

            if (($load->items_count ?? 0) === 0) {
                continue;
            }

            $sum = 0.0;

            foreach ($load->items as $item) {
                $value = $item->total_units;

                if ($value === null) {
                    $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                    $rawValue = $raw['load_units'] ?? $raw['units'] ?? null;

                    if ($rawValue !== null && is_numeric(str_replace(',', '', (string) $rawValue))) {
                        $value = (float) str_replace(',', '', (string) $rawValue);
                    } else {
                        $lec = is_numeric($item->units_lec ?? null) ? (float) $item->units_lec : 0.0;
                        $lab = is_numeric($item->units_lab ?? null) ? (float) $item->units_lab : 0.0;
                        $value = $lec + $lab;
                    }
                }

                $sum += (float) $value;
            }

            $load->total_units_sum = $sum;
        }
    }

    protected function exportStatusLabel(string $context, FacultyLoadStatus|string|null $status): string
    {
        $rawStatus = is_string($status) ? $status : $status?->value;
        $rawStatus = strtoupper(trim((string) $rawStatus));

        return match ($context) {
            'term' => $rawStatus === FacultyLoadStatus::PENDING->value
                ? 'Unsubmitted'
                : $this->humanizeStatus($rawStatus),
            'clearance' => $rawStatus === FacultyLoadStatus::SUBMITTED->value
                ? 'Uncleared'
                : $this->humanizeStatus($rawStatus),
            'faculty' => in_array($rawStatus, [
                FacultyLoadStatus::PENDING->value,
                FacultyLoadStatus::FOR_REVISION->value,
            ], true)
                ? 'Unsubmitted'
                : $this->humanizeStatus($rawStatus),
            default => $this->humanizeStatus($rawStatus),
        };
    }

    protected function humanizeStatus(string $status): string
    {
        if ($status === '') {
            return '';
        }

        return ucwords(strtolower(str_replace('_', ' ', $status)));
    }

    protected function facultyDisplayName(?Faculty $faculty): string
    {
        if (! $faculty instanceof Faculty) {
            return '';
        }

        return trim(implode(' ', array_filter([
            $faculty->full_name,
            $faculty->middle_name,
        ], fn ($value) => trim((string) $value) !== '')));
    }
}
