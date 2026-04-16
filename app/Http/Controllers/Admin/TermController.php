<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TermStatusUpdateRequest;
use App\Http\Requests\Admin\TermUpdateRequest;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $query = Term::query()
            ->withCompletionCounts()
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

    public function updateStatus(TermStatusUpdateRequest $request, Term $term): RedirectResponse
    {
        $this->authorize('update', $term);

        $status = (string) $request->validated('status');

        $term->is_active = $status === 'ACTIVE';
        $term->save();

        return redirect()->route('admin.terms.index')
            ->with('success', $term->is_active ? 'Term activated successfully.' : 'Term deactivated successfully.');
    }
}
