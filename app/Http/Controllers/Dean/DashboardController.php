<?php

namespace App\Http\Controllers\Dean;

use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $department = $user?->department()->first(['id', 'name']);
        $departmentId = $user?->department_id;

        $totalFacultyCount = 0;
        $loadsSubmitted = 0;
        $loadsPendingRevision = 0;

        if ($departmentId !== null) {
            $totalFacultyCount = Faculty::query()
                ->where('department_id', $departmentId)
                ->count();

            $loadsSubmitted = FacultyLoad::query()
                ->where('department_id', $departmentId)
                ->whereIn('status', [
                    FacultyLoadStatus::SUBMITTED->value,
                    FacultyLoadStatus::CLEARED->value,
                ])
                ->count();

            $loadsPendingRevision = FacultyLoad::query()
                ->where('department_id', $departmentId)
                ->whereIn('status', [
                    FacultyLoadStatus::PENDING->value,
                    FacultyLoadStatus::FOR_REVISION->value,
                ])
                ->count();
        }

        return Inertia::render('Dean/Dashboard', [
            'department' => $department,
            'stats' => [
                'totalFacultyCount' => $totalFacultyCount,
                'loadsSubmitted' => $loadsSubmitted,
                'loadsPendingRevision' => $loadsPendingRevision,
            ],
        ]);
    }
}
