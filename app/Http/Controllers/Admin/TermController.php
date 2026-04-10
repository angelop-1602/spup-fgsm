<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Terms\Services\TermCompletionService;
use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TermUpdateRequest;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function __construct(
        private TermCompletionService $termCompletionService,
    ) {}

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

        return Inertia::render('Admin/Terms/Index', [
            'terms' => $terms,
            'filters' => [
                'q' => $search,
            ],
        ]);
    }

    public function edit(Term $term): Response
    {
        $this->authorize('update', $term);

        return Inertia::render('Admin/Terms/Edit', [
            'term' => $term,
        ]);
    }

    public function update(TermUpdateRequest $request, Term $term): RedirectResponse
    {
        $term->update($request->validated());

        return redirect()->route('admin.terms.index')
            ->with('success', 'Term updated successfully.');
    }

    public function destroy(Term $term): RedirectResponse
    {
        $this->authorize('delete', $term);

        $term->delete();

        return redirect()->route('admin.terms.index')
            ->with('success', 'Term deleted successfully.');
    }

    public function unlock(Request $request, Term $term): RedirectResponse
    {
        $this->authorize('unlock', $term);

        $term->admin_override_unlocked = true;
        $term->save();

        return redirect()->route('admin.terms.index')
            ->with('success', 'Term unlocked successfully.');
    }

    public function lock(Request $request, Term $term): RedirectResponse
    {
        $this->authorize('lock', $term);

        $term->admin_override_unlocked = false;
        $term->save();

        return redirect()->route('admin.terms.index')
            ->with('success', 'Term locked successfully.');
    }

    public function toggleActive(Request $request, Term $term): RedirectResponse
    {
        $this->authorize('update', $term);

        $term->is_active = ! $term->is_active;
        $term->save();

        return redirect()->route('admin.terms.index')
            ->with('success', $term->is_active ? 'Term activated successfully.' : 'Term deactivated successfully.');
    }
}
