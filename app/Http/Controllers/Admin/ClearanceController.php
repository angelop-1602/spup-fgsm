<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Terms\Services\TermCompletionService;
use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FacultyLoad;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceController extends Controller
{
    public function __construct(
        private TermCompletionService $termCompletionService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $search = (string) $request->input('q', '');

        $termsQuery = Term::query()
            ->withCount([
                'facultyLoads as total_loads',
                'facultyLoads as completed_loads' => function ($query): void {
                    $query->whereIn('status', [
                        FacultyLoadStatus::SUBMITTED->value,
                        FacultyLoadStatus::CLEARED->value,
                    ]);
                },
                'facultyLoads as submitted_loads' => function ($query): void {
                    $query->where('status', FacultyLoadStatus::SUBMITTED->value);
                },
                'facultyLoads as cleared_loads' => function ($query): void {
                    $query->where('status', FacultyLoadStatus::CLEARED->value);
                },
            ])
            ->orderByDesc('academic_year')
            ->orderBy('term_name');

        if ($search !== '') {
            $termsQuery->where(function ($query) use ($search): void {
                $query->where('academic_year', 'like', '%'.$search.'%')
                    ->orWhere('period_code', 'like', '%'.$search.'%')
                    ->orWhere('term_name', 'like', '%'.$search.'%');
            });
        }

        $terms = $termsQuery->paginate(15)->withQueryString();

        return Inertia::render('Admin/Clearance/Index', [
            'terms' => $terms,
            'filters' => [
                'q' => $search,
            ],
        ]);
    }

    public function show(Request $request, Term $term): Response
    {
        $this->authorize('view', $term);
        $this->authorize('viewAny', FacultyLoad::class);

        $search = (string) $request->input('q', '');
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 25, 50], true)) {
            $perPage = 10;
        }

        $loadsQuery = FacultyLoad::query()
            ->where('term_id', $term->id)
            ->whereIn('status', [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ])
            ->with([
                'faculty:id,faculty_code,full_name',
                'department:id,name,code',
            ])
            ->withCount('items')
            ->withSum('items as total_units_sum', 'total_units')
            ->orderByRaw(
                'case when status = ? then 0 when status = ? then 1 else 2 end',
                [FacultyLoadStatus::SUBMITTED->value, FacultyLoadStatus::CLEARED->value],
            )
            ->orderByDesc('updated_at');

        if ($search !== '') {
            $loadsQuery->where(function ($query) use ($search): void {
                $query->whereHas('faculty', function ($facultyQuery) use ($search): void {
                    $facultyQuery->where('faculty_code', 'like', '%'.$search.'%')
                        ->orWhere('full_name', 'like', '%'.$search.'%');
                })->orWhereHas('department', function ($departmentQuery) use ($search): void {
                    $departmentQuery->where('name', 'like', '%'.$search.'%')
                        ->orWhere('code', 'like', '%'.$search.'%');
                });
            });
        }

        $loads = $loadsQuery->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Clearance/Show', [
            'term' => $term->only([
                'id',
                'period_code',
                'term_name',
                'academic_year',
            ]),
            'loads' => $loads,
            'filters' => [
                'q' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function clear(Request $request, Term $term, FacultyLoad $facultyLoad): RedirectResponse
    {
        $this->authorize('view', $term);
        $this->authorize('update', $facultyLoad);

        if ((int) $facultyLoad->term_id !== (int) $term->id) {
            abort(404);
        }

        /** @var User|null $actor */
        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(403);
        }

        $currentStatus = (string) ($facultyLoad->status?->value ?? $facultyLoad->status);

        if ($currentStatus === FacultyLoadStatus::CLEARED->value) {
            return back()
                ->with('success', 'Faculty load is already cleared.');
        }

        if ($currentStatus !== FacultyLoadStatus::SUBMITTED->value) {
            return back()
                ->withErrors([
                    'status' => 'Only submitted faculty loads can be marked as cleared.',
                ]);
        }

        DB::transaction(function () use ($facultyLoad, $actor, $currentStatus): void {
            $facultyLoad->status = FacultyLoadStatus::CLEARED;
            $facultyLoad->checked_at = now();
            $facultyLoad->checked_by_user_id = $actor->id;
            $facultyLoad->save();

            AuditLog::query()->create([
                'faculty_load_id' => $facultyLoad->id,
                'actor_user_id' => $actor->id,
                'action' => 'FACULTY_LOAD_CLEARED',
                'old_status' => $currentStatus,
                'new_status' => FacultyLoadStatus::CLEARED->value,
                'notes' => 'clearance=marked',
                'created_at' => now(),
            ]);
        });

        $term->refresh();
        $this->termCompletionService->recalculate($term, $actor);

        return back()
            ->with('success', 'Faculty load marked as cleared.');
    }

}
