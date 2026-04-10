<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Terms\Services\CreateTermsService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CommitGeneratedTermsRequest;
use App\Http\Requests\Admin\GenerateTermsPreviewRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CreateTermsController extends Controller
{
    public function __construct(
        protected CreateTermsService $service,
    ) {
    }

    public function form(Request $request): Response
    {
        $this->authorize('create', \App\Models\Term::class);

        $sessionTerms = (array) $request->session()->get('generated_terms', []);

        return Inertia::render('Admin/Terms/Create', [
            'terms' => $sessionTerms,
        ]);
    }

    public function preview(GenerateTermsPreviewRequest $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Term::class);

        $data = $request->validated();

        $rows = $this->service->buildDraft(
            (int) $data['year_start'],
            (int) $data['year_end'],
            true,
            true,
        );

        $normalized = $this->service->validateDraft($rows);

        $request->session()->put('generated_terms', $normalized);

        return redirect()
            ->route('admin.terms.create-batch.form')
            ->with('status', 'preview-ready');
    }

    public function store(CommitGeneratedTermsRequest $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Term::class);

        $data = $request->validated();

        $result = $this->service->commitDraft($data['terms'], $request->user());

        $request->session()->forget('generated_terms');

        return redirect()
            ->route('admin.terms.index')
            ->with('status', 'terms-created')
            ->with('terms_created', count($result['created']))
            ->with('terms_skipped', count($result['skipped']));
    }

    public function reset(Request $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Term::class);

        $request->session()->forget('generated_terms');

        return redirect()->route('admin.terms.create-batch.form');
    }
}

