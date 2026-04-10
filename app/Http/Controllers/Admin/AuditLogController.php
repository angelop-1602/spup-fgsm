<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', AuditLog::class);

        $terms = Term::query()
            ->orderByDesc('academic_year')
            ->orderBy('term_name')
            ->get(['id', 'academic_year', 'term_name', 'period_code']);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $faculty = Faculty::query()
            ->orderBy('full_name')
            ->get(['id', 'faculty_code', 'full_name']);

        $actors = User::query()
            ->whereHas('roles', function ($q): void {
                $q->whereIn('name', ['ADMIN', 'REGISTRAR_STAFF']);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $filters = [
            'term_id' => $request->integer('term_id'),
            'department_id' => $request->integer('department_id'),
            'faculty_id' => $request->integer('faculty_id'),
            'actor_user_id' => $request->integer('actor_user_id'),
            'date_from' => $request->string('date_from')->toString(),
            'date_to' => $request->string('date_to')->toString(),
        ];

        $query = AuditLog::query()
            ->with(['facultyLoad.term', 'facultyLoad.faculty', 'facultyLoad.department', 'actor'])
            ->orderByDesc('created_at');

        if ($filters['term_id']) {
            $query->whereHas('facultyLoad', function ($q) use ($filters): void {
                $q->where('term_id', $filters['term_id']);
            });
        }

        if ($filters['department_id']) {
            $query->whereHas('facultyLoad', function ($q) use ($filters): void {
                $q->where('department_id', $filters['department_id']);
            });
        }

        if ($filters['faculty_id']) {
            $query->whereHas('facultyLoad', function ($q) use ($filters): void {
                $q->where('faculty_id', $filters['faculty_id']);
            });
        }

        if ($filters['actor_user_id']) {
            $query->where('actor_user_id', $filters['actor_user_id']);
        }

        if ($filters['date_from']) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if ($filters['date_to']) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $logs = $query->paginate(15)->withQueryString();

        return Inertia::render('Admin/AuditLogs/Index', [
            'logs' => $logs,
            'terms' => $terms,
            'departments' => $departments,
            'faculty' => $faculty,
            'actors' => $actors,
            'filters' => $filters,
        ]);
    }
}
