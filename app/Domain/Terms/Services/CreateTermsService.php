<?php

namespace App\Domain\Terms\Services;

use App\Models\Term;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTermsService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function buildDraft(int $yearStart, int $yearEnd, bool $genCollege, bool $genGraduate): array
    {
        $rows = [];

        if ($genCollege) {
            $rows = array_merge($rows, $this->defaultsForUnit('COLLEGE', $yearStart, $yearEnd));
        }

        if ($genGraduate) {
            $rows = array_merge($rows, $this->defaultsForUnit('GRADUATE', $yearStart, $yearEnd));
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     *
     * @throws ValidationException
     */
    public function validateDraft(array $rows): array
    {
        $normalized = collect($rows)->map(function (array $row): array {
            $yearStart = (int) ($row['year_start'] ?? 0);
            $yearEnd = (int) ($row['year_end'] ?? 0);

            return [
                'school_unit' => strtoupper((string) ($row['school_unit'] ?? '')),
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'academic_year' => (string) ($row['academic_year'] ?? ($yearStart.'-'.$yearEnd)),
                'term_name' => trim((string) ($row['term_name'] ?? '')),
                'period_code' => trim((string) ($row['period_code'] ?? '')),
                'display_code' => $row['display_code'] ?? null,
                'is_active' => (bool) ($row['is_active'] ?? false),
            ];
        });

        $errors = [];

        foreach ($normalized as $index => $row) {
            if (! in_array($row['school_unit'], ['COLLEGE', 'GRADUATE'], true)) {
                $errors["terms.$index.school_unit"] = 'Invalid school unit.';
            }

            if ($row['year_start'] <= 0 || $row['year_end'] < $row['year_start']) {
                $errors["terms.$index.year_start"] = 'Invalid academic year range.';
            }

            if ($row['term_name'] === '') {
                $errors["terms.$index.term_name"] = 'The term name field is required.';
            }

            if ($row['period_code'] === '') {
                $errors["terms.$index.period_code"] = 'The period code field is required.';
            }
        }

        $byPeriod = $normalized->groupBy(fn ($r) => $r['school_unit'].'|'.$r['period_code']);
        foreach ($byPeriod as $group) {
            if ($group->count() > 1) {
                foreach ($group->keys() as $i) {
                    $errors["terms.$i.period_code"] = 'Duplicate period code in draft for this school unit.';
                }
            }
        }

        $byName = $normalized->groupBy(
            fn ($r) => $r['school_unit'].'|'.$r['year_start'].'|'.$r['year_end'].'|'.$r['term_name']
        );
        foreach ($byName as $group) {
            if ($group->count() > 1) {
                foreach ($group->keys() as $i) {
                    $errors["terms.$i.term_name"] = 'Duplicate term name in draft for this academic year.';
                }
            }
        }

        foreach ($normalized as $index => $row) {
            $exists = Term::query()
                ->where('school_unit', $row['school_unit'])
                ->where('year_start', $row['year_start'])
                ->where('year_end', $row['year_end'])
                ->where('term_name', $row['term_name'])
                ->exists();

            if ($exists) {
                $errors["terms.$index.term_name"] = 'A term with this name already exists for this academic year.';
            }

            $periodExists = Term::query()
                ->where('school_unit', $row['school_unit'])
                ->where('period_code', $row['period_code'])
                ->exists();

            if ($periodExists) {
                $errors["terms.$index.period_code"] = 'A term with this period code already exists for this school unit.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $normalized->values()->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{created: array<int, int>, skipped: array<int, int>}
     */
    public function commitDraft(array $rows, User $actor): array
    {
        $created = [];
        $skipped = [];

        DB::transaction(function () use ($rows, &$created, &$skipped): void {
            foreach ($rows as $row) {
                $existing = Term::query()
                    ->where('school_unit', $row['school_unit'])
                    ->where('year_start', $row['year_start'])
                    ->where('year_end', $row['year_end'])
                    ->where('term_name', $row['term_name'])
                    ->first();

                if ($existing !== null) {
                    $skipped[] = $existing->id;
                    continue;
                }

                $term = Term::create([
                    'school_unit' => $row['school_unit'],
                    'year_start' => $row['year_start'],
                    'year_end' => $row['year_end'],
                    'academic_year' => $row['academic_year'],
                    'term_name' => $row['term_name'],
                    'period_code' => $row['period_code'],
                    'display_code' => $row['display_code'],
                    'is_active' => $row['is_active'],
                ]);

                $created[] = $term->id;
            }
        });

        return compact('created', 'skipped');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultsForUnit(string $schoolUnit, int $yearStart, int $yearEnd): array
    {
        $ay = $yearStart.'-'.$yearEnd;

        if ($schoolUnit === 'COLLEGE') {
            return [
                [
                    'school_unit' => $schoolUnit,
                    'year_start' => $yearStart,
                    'year_end' => $yearEnd,
                    'academic_year' => $ay,
                    'term_name' => 'First Semester',
                    'period_code' => '1ST '.$yearStart,
                    'display_code' => '1ST '.$yearStart,
                    'is_active' => true,
                ],
                [
                    'school_unit' => $schoolUnit,
                    'year_start' => $yearStart,
                    'year_end' => $yearEnd,
                    'academic_year' => $ay,
                    'term_name' => 'Second Semester',
                    'period_code' => '2ND '.$yearStart,
                    'display_code' => '2ND '.$yearStart,
                    'is_active' => true,
                ],
                [
                    'school_unit' => $schoolUnit,
                    'year_start' => $yearStart,
                    'year_end' => $yearEnd,
                    'academic_year' => $ay,
                    'term_name' => 'Summer',
                    'period_code' => 'SUM '.$yearEnd.' COL',
                    'display_code' => 'SUM '.$yearStart.' - '.$yearEnd,
                    'is_active' => true,
                ],
            ];
        }

        return [
            [
                'school_unit' => $schoolUnit,
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'academic_year' => $ay,
                'term_name' => 'First Trimester',
                'period_code' => '1T'.$yearStart,
                'display_code' => '1T'.$yearStart,
                'is_active' => true,
            ],
            [
                'school_unit' => $schoolUnit,
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'academic_year' => $ay,
                'term_name' => 'Second Trimester',
                'period_code' => '2T'.$yearStart,
                'display_code' => '2T'.$yearStart,
                'is_active' => true,
            ],
            [
                'school_unit' => $schoolUnit,
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'academic_year' => $ay,
                'term_name' => 'Third Trimester',
                'period_code' => '3T'.$yearStart,
                'display_code' => '3T'.$yearStart,
                'is_active' => true,
            ],
            [
                'school_unit' => $schoolUnit,
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'academic_year' => $ay,
                'term_name' => 'Summer',
                'period_code' => 'SUM '.$yearEnd.' GS',
                'display_code' => 'SUM '.$yearStart.' - '.$yearEnd,
                'is_active' => true,
            ],
        ];
    }
}

