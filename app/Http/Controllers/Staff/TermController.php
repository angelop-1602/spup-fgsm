<?php

namespace App\Http\Controllers\Staff;

use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $query = Term::query()
            ->withCount([
                'facultyLoads as total_loads',
                'facultyLoads as submitted_loads' => function ($q) {
                    $q->whereIn('status', [
                        FacultyLoadStatus::SUBMITTED->value,
                        FacultyLoadStatus::CLEARED->value,
                    ]);
                },
            ])
            ->orderBy('academic_year', 'desc')
            ->orderBy('term_name');

        $search = $request->input('q');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('academic_year', 'like', "%{$search}%")
                    ->orWhere('period_code', 'like', "%{$search}%");
            });
        }

        $terms = $query->paginate(15)->withQueryString();

        $reportTerms = Term::query()
            ->orderByDesc('academic_year')
            ->orderBy('term_name')
            ->get(['id', 'academic_year', 'term_name', 'period_code']);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Staff/Terms/Index', [
            'terms' => $terms,
            'filters' => [
                'q' => $search,
            ],
            'reportTerms' => $reportTerms,
            'departments' => $departments,
        ]);
    }
}
