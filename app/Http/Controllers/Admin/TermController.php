<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Terms\Services\TermIndexListingService;
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
    public function index(Request $request, TermIndexListingService $termIndexListingService): Response
    {
        $this->authorize('viewAny', Term::class);

        return Inertia::render('Admin/Terms/Index', $termIndexListingService->build($request));
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

        return redirect()->route('admin.terms.index', $request->only([
            'q',
            'page',
        ]))
            ->with('success', $term->is_active ? 'Term activated successfully.' : 'Term deactivated successfully.');
    }
}
