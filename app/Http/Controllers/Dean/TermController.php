<?php

namespace App\Http\Controllers\Dean;

use App\Domain\Terms\Services\TermIndexListingService;
use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request, TermIndexListingService $termIndexListingService): Response
    {
        $this->authorize('viewAny', Term::class);

        return Inertia::render('Dean/Terms/Index', $termIndexListingService->build($request));
    }
}
