<?php

namespace App\Domain\Terms\Services;

use App\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class TermIndexListingService
{
    private const int FLAT_TERMS_PER_PAGE = 15;

    private const int YEAR_GROUPS_PER_PAGE = 10;

    /**
     * @return array<string, mixed>
     */
    public function build(Request $request): array
    {
        $search = trim((string) $request->input('q', ''));
        $latestAcademicYear = Term::query()
            ->orderByDesc('academic_year')
            ->value('academic_year');

        if ($search !== '') {
            return [
                'listing_mode' => 'flat',
                'filters' => [
                    'q' => $search,
                ],
                'latest_academic_year' => $latestAcademicYear,
                'grouped_terms' => null,
                'terms' => $this->buildFlatTerms($search),
            ];
        }

        return [
            'listing_mode' => 'grouped',
            'filters' => [
                'q' => null,
            ],
            'latest_academic_year' => $latestAcademicYear,
            'grouped_terms' => $this->buildGroupedTerms($request),
            'terms' => null,
        ];
    }

    private function buildFlatTerms(string $search): LengthAwarePaginator
    {
        $terms = Term::query()
            ->withCompletionCounts()
            ->where(function ($query) use ($search): void {
                $query->where('period_code', 'like', '%'.$search.'%')
                    ->orWhere('academic_year', 'like', '%'.$search.'%')
                    ->orWhere('term_name', 'like', '%'.$search.'%');
            })
            ->orderByDesc('academic_year')
            ->orderBy('term_name')
            ->paginate(self::FLAT_TERMS_PER_PAGE)
            ->withQueryString();

        $terms->setCollection(
            $terms->getCollection()->map(
                fn (Term $term): array => $this->mapTerm($term),
            ),
        );

        return $terms;
    }

    private function buildGroupedTerms(Request $request): LengthAwarePaginator
    {
        $currentPage = max(1, (int) $request->integer('page', 1));

        $academicYears = Term::query()
            ->select('academic_year')
            ->distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->values();

        $pageAcademicYears = $academicYears
            ->forPage($currentPage, self::YEAR_GROUPS_PER_PAGE)
            ->values();

        $terms = $pageAcademicYears->isEmpty()
            ? collect()
            : Term::query()
                ->withCompletionCounts()
                ->whereIn('academic_year', $pageAcademicYears->all())
                ->orderByDesc('academic_year')
                ->orderBy('term_name')
                ->get();

        $termsByAcademicYear = $terms->groupBy('academic_year');

        $groups = $pageAcademicYears->map(
            function (string $academicYear) use ($termsByAcademicYear): array {
                return [
                    'academic_year' => $academicYear,
                    'terms' => $termsByAcademicYear
                        ->get($academicYear, collect())
                        ->map(fn (Term $term): array => $this->mapTerm($term))
                        ->values()
                        ->all(),
                ];
            },
        );

        $paginator = new LengthAwarePaginator(
            $groups,
            $academicYears->count(),
            self::YEAR_GROUPS_PER_PAGE,
            $currentPage,
            [
                'path' => $request->url(),
                'pageName' => 'page',
            ],
        );

        $paginator->appends($request->query());

        return $paginator;
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function mapTerm(Term $term): array
    {
        return [
            'id' => (int) $term->id,
            'period_code' => (string) $term->period_code,
            'term_name' => (string) $term->term_name,
            'academic_year' => (string) $term->academic_year,
            'is_active' => (bool) $term->is_active,
            'total_loads' => (int) ($term->total_loads ?? 0),
            'completed_loads' => (int) ($term->completed_loads ?? 0),
        ];
    }
}
