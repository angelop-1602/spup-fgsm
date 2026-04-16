<?php

namespace App\Http\Controllers\Dean;

use App\Enums\FacultyLoadItemStatus;
use App\Http\Controllers\Controller;
use App\Models\FacultyLoad;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermFacultyLoadController extends Controller
{
    public function show(Request $request, Term $term): Response
    {
        $this->authorize('view', $term);
        $this->authorize('viewAny', FacultyLoad::class);
        $term->loadCompletionCounts();

        $user = $request->user();
        $departmentId = $user?->department_id;

        if ($departmentId === null) {
            abort(403);
        }

        $search = (string) $request->input('q', '');
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 25, 50], true)) {
            $perPage = 10;
        }

        $loadsQuery = FacultyLoad::query()
            ->where('term_id', $term->id)
            ->where('department_id', $departmentId)
            ->with([
                'faculty:id,faculty_code,full_name',
                'department:id,name,code',
            ])
            ->withCount([
                'items',
                'items as submitted_items_count' => function ($query): void {
                    $query->where(
                        'status',
                        FacultyLoadItemStatus::SUBMITTED->value,
                    );
                },
                'items as returned_items_count' => function ($query): void {
                    $query->where(
                        'status',
                        FacultyLoadItemStatus::RETURNED->value,
                    );
                },
            ])
            ->orderByDesc('updated_at');

        if ($search !== '') {
            $loadsQuery->where(function ($query) use ($search): void {
                $query->whereHas(
                    'faculty',
                    function ($facultyQuery) use ($search): void {
                        $facultyQuery
                            ->where('faculty_code', 'like', '%'.$search.'%')
                            ->orWhere('full_name', 'like', '%'.$search.'%');
                    },
                )->orWhereHas(
                    'department',
                    function ($departmentQuery) use ($search): void {
                        $departmentQuery
                            ->where('name', 'like', '%'.$search.'%')
                            ->orWhere('code', 'like', '%'.$search.'%');
                    },
                );
            });
        }

        $loads = $loadsQuery->paginate($perPage)->withQueryString();

        return Inertia::render('Dean/Terms/FacultyLoads', [
            'term' => $term->only([
                'id',
                'period_code',
                'term_name',
                'academic_year',
                'is_active',
                'total_loads',
                'completed_loads',
            ]),
            'loads' => $loads,
            'filters' => [
                'q' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function view(Request $request, Term $term, FacultyLoad $facultyLoad): Response
    {
        $this->authorize('view', $term);
        $this->authorize('view', $facultyLoad);
        $term->loadCompletionCounts();

        $user = $request->user();
        $departmentId = $user?->department_id;

        if ($departmentId === null) {
            abort(403);
        }

        if ((int) $facultyLoad->term_id !== (int) $term->id) {
            abort(404);
        }

        if ((int) $facultyLoad->department_id !== (int) $departmentId) {
            abort(404);
        }

        $facultyLoad->load([
            'faculty:id,faculty_code,full_name',
            'department:id,name,code',
            'items' => function ($query): void {
                $query->orderBy('id');
            },
        ]);

        return Inertia::render('Dean/Terms/FacultyLoadShow', [
            'term' => $term->only([
                'id',
                'period_code',
                'term_name',
                'academic_year',
                'is_active',
                'total_loads',
                'completed_loads',
            ]),
            'load' => [
                'id' => (int) $facultyLoad->id,
                'status' => (string) ($facultyLoad->status?->value ?? $facultyLoad->status),
                'faculty' => $facultyLoad->faculty?->only([
                    'id',
                    'faculty_code',
                    'full_name',
                ]),
                'department' => $facultyLoad->department?->only([
                    'id',
                    'name',
                    'code',
                ]),
                'items' => $facultyLoad->items->map(function ($item): array {
                    return [
                        'id' => (int) $item->id,
                        'subject_code' => $item->subject_code,
                        'section' => $item->section,
                        'schedule' => $item->schedule,
                        'room' => $item->room,
                        'units_lec' => $item->units_lec,
                        'units_lab' => $item->units_lab,
                        'total_units' => $item->total_units,
                        'status' => (string) ($item->status?->value ?? $item->status),
                        'remarks' => $item->remarks,
                        'raw_payload_json' => $item->raw_payload_json,
                    ];
                })->values()->all(),
            ],
        ]);
    }
}
