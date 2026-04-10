<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Dashboard\Services\DepartmentAnalyticsService;
use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private DepartmentAnalyticsService $departmentAnalyticsService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Term::class);

        $payload = $this->departmentAnalyticsService
            ->buildAnalyticsPayload($request->integer('term_id'));

        return Inertia::render('Admin/Dashboard', $payload);
    }
}
