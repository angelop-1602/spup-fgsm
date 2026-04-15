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
    ) {}

    public function form(Request $request): Response
    {
        $this->authorize('create', \App\Models\Term::class);

        $preview = $this->validatedPreviewQuery($request);
        $terms = $preview === null
            ? []
            : $this->previewTerms((int) $preview['year_start'], (int) $preview['year_end']);

        return Inertia::render('Admin/Terms/Create', [
            'terms' => $terms,
            'previewYears' => $preview,
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

        $this->service->validateDraft($rows);

        return redirect()
            ->route('admin.terms.create-batch.form', [
                'year_start' => $data['year_start'],
                'year_end' => $data['year_end'],
            ])
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

    /**
     * @return array{year_start: int, year_end: int}|null
     */
    private function validatedPreviewQuery(Request $request): ?array
    {
        if (! $request->has(['year_start', 'year_end'])) {
            return null;
        }

        $yearStart = $request->integer('year_start');
        $yearEnd = $request->integer('year_end');

        if ($yearStart <= 0 || $yearEnd < $yearStart) {
            return null;
        }

        return [
            'year_start' => $yearStart,
            'year_end' => $yearEnd,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function previewTerms(int $yearStart, int $yearEnd): array
    {
        $rows = $this->service->buildDraft(
            $yearStart,
            $yearEnd,
            true,
            true,
        );

        return $this->service->validateDraft($rows);
    }
}
