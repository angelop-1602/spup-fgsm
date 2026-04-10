<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $search = (string) $request->input('q', '');

        $query = Term::query()
            ->orderByDesc('academic_year')
            ->orderBy('term_name');

        if ($search !== '') {
            $query->where(function ($termQuery) use ($search): void {
                $termQuery->where('academic_year', 'like', '%'.$search.'%')
                    ->orWhere('period_code', 'like', '%'.$search.'%')
                    ->orWhere('term_name', 'like', '%'.$search.'%');
            });
        }

        $terms = $query->paginate(15)->withQueryString();

        return Inertia::render('Dean/Terms/Index', [
            'terms' => $terms,
            'filters' => [
                'q' => $search,
            ],
        ]);
    }
}
