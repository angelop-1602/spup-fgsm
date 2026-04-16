<?php

namespace App\Http\Controllers\Staff;

use App\Domain\Terms\Services\TermIndexListingService;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request, TermIndexListingService $termIndexListingService): Response
    {
        $this->authorize('viewAny', Term::class);

        $listing = $termIndexListingService->build($request);

        $reportTerms = Term::query()
            ->orderByDesc('academic_year')
            ->orderBy('term_name')
            ->get(['id', 'academic_year', 'term_name', 'period_code']);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Staff/Terms/Index', [
            ...$listing,
            'reportTerms' => $reportTerms,
            'departments' => $departments,
        ]);
    }
}
