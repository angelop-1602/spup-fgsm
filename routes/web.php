<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    $user = auth()->user();

    if ($user !== null) {
        if ($user->hasRole('ADMIN')) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->hasRole('REGISTRAR_STAFF')) {
            return redirect()->route('staff.dashboard');
        }

        if ($user->hasRole('DEAN')) {
            return redirect()->route('dean.dashboard');
        }
    }

    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::prefix('admin')
    ->as('admin.')
    ->middleware(['auth', 'verified', 'role:ADMIN'])
    ->group(function (): void {
        Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])
            ->name('dashboard');

        // Term creation wizard
        Route::get('terms/create-batch', [\App\Http\Controllers\Admin\CreateTermsController::class, 'form'])
            ->name('terms.create-batch.form');
        Route::post('terms/create-batch/preview', [\App\Http\Controllers\Admin\CreateTermsController::class, 'preview'])
            ->name('terms.create-batch.preview');
        Route::post('terms/create-batch/store', [\App\Http\Controllers\Admin\CreateTermsController::class, 'store'])
            ->name('terms.create-batch.store');
        Route::post('terms/create-batch/reset', [\App\Http\Controllers\Admin\CreateTermsController::class, 'reset'])
            ->name('terms.create-batch.reset');

        // Term management (no manual create route, use generator instead)
        Route::resource('terms', \App\Http\Controllers\Admin\TermController::class)
            ->only(['index', 'edit', 'update', 'destroy']);
        Route::patch('terms/{term}/status', [\App\Http\Controllers\Admin\TermController::class, 'updateStatus'])
            ->name('terms.status');
        Route::get('terms/{term}/faculty-loads', [\App\Http\Controllers\Admin\TermFacultyLoadController::class, 'show'])
            ->name('terms.faculty-loads.show');
        Route::get('terms/{term}/faculty-loads/{facultyLoad}', [\App\Http\Controllers\Admin\TermFacultyLoadController::class, 'view'])
            ->name('terms.faculty-loads.view');
        Route::patch('terms/{term}/faculty-loads/{facultyLoad}/items/{item}/status', [\App\Http\Controllers\Admin\TermFacultyLoadController::class, 'updateItemStatus'])
            ->name('terms.faculty-loads.items.update-status');
        Route::post('terms/{term}/faculty-loads/import', [\App\Http\Controllers\Admin\TermFacultyLoadController::class, 'import'])
            ->name('terms.faculty-loads.import');

        // Clearance management
        Route::get('clearance', [\App\Http\Controllers\Admin\ClearanceController::class, 'index'])
            ->name('clearance.index');
        Route::get('clearance/{term}', [\App\Http\Controllers\Admin\ClearanceController::class, 'show'])
            ->name('clearance.show');
        Route::get('clearance/{term}/export', [\App\Http\Controllers\Admin\PdfExportController::class, 'export'])
            ->defaults('context', 'clearance')
            ->name('clearance.export');
        Route::patch('clearance/{term}/faculty-loads/{facultyLoad}/clear', [\App\Http\Controllers\Admin\ClearanceController::class, 'clear'])
            ->name('clearance.clear');

        // Departments
        Route::resource('departments', \App\Http\Controllers\Admin\DepartmentController::class)->except(['show']);

        // Subjects / courses (backend ready even if not yet shown in sidebar)
        Route::resource('subjects', \App\Http\Controllers\Admin\SubjectController::class)->except(['show']);

        // Faculty masterlist
        Route::post('faculty/import', [\App\Http\Controllers\Admin\FacultyController::class, 'import'])
            ->name('faculty.import');
        Route::resource('faculty', \App\Http\Controllers\Admin\FacultyController::class)->except(['show']);

        // Users (Registrar Staff, Deans, Admins)
        Route::resource('users', \App\Http\Controllers\Admin\UserController::class)->except(['show']);

        // Deans
        Route::resource('deans', \App\Http\Controllers\Admin\DeanController::class)->except(['show']);

        // Reports
        Route::get('reports', [\App\Http\Controllers\Admin\ReportController::class, 'index'])
            ->name('reports.index');
        Route::get('reports/export', [\App\Http\Controllers\Admin\ReportController::class, 'export'])
            ->name('reports.export');
        Route::get('reports/{term}/export-pdf', [\App\Http\Controllers\Admin\PdfExportController::class, 'export'])
            ->defaults('context', 'term')
            ->name('reports.export-pdf');
        Route::get('reports/faculty/{faculty}/export-pdf', [\App\Http\Controllers\Admin\PdfExportController::class, 'exportFaculty'])
            ->name('reports.faculty-export-pdf');

        // Audit logs
        Route::get('audit-logs', [\App\Http\Controllers\Admin\AuditLogController::class, 'index'])
            ->name('audit-logs.index');

        // Settings
        Route::get('settings', [\App\Http\Controllers\Admin\SettingsController::class, 'index'])
            ->name('settings.index');
    });

Route::prefix('staff')
    ->as('staff.')
    ->middleware(['auth', 'verified', 'role:REGISTRAR_STAFF'])
    ->group(function (): void {
        Route::get('/', [\App\Http\Controllers\Staff\DashboardController::class, 'index'])
            ->name('dashboard');

        Route::get('terms', [\App\Http\Controllers\Staff\TermController::class, 'index'])
            ->name('terms.index');
        Route::get('terms/{term}/faculty-loads', [\App\Http\Controllers\Staff\TermFacultyLoadController::class, 'show'])
            ->name('terms.faculty-loads.show');
        Route::get('terms/{term}/faculty-loads/{facultyLoad}', [\App\Http\Controllers\Staff\TermFacultyLoadController::class, 'view'])
            ->name('terms.faculty-loads.view');
        Route::patch('terms/{term}/faculty-loads/{facultyLoad}/items/{item}/status', [\App\Http\Controllers\Staff\TermFacultyLoadController::class, 'updateItemStatus'])
            ->name('terms.faculty-loads.items.update-status');
        Route::post('terms/{term}/faculty-loads/import', [\App\Http\Controllers\Staff\TermFacultyLoadController::class, 'import'])
            ->name('terms.faculty-loads.import');

        // Reports
        Route::get('reports', [\App\Http\Controllers\Staff\ReportController::class, 'index'])
            ->name('reports.index');
        Route::get('reports/export', [\App\Http\Controllers\Staff\ReportController::class, 'export'])
            ->name('reports.export');
        Route::get('reports/{term}/export-pdf', [\App\Http\Controllers\Staff\PdfExportController::class, 'export'])
            ->name('reports.export-pdf');
        Route::get('reports/faculty/{faculty}/export-pdf', [\App\Http\Controllers\Staff\PdfExportController::class, 'exportFaculty'])
            ->name('reports.faculty-export-pdf');
    });

Route::prefix('dean')
    ->as('dean.')
    ->middleware(['auth', 'verified', 'role:DEAN'])
    ->group(function (): void {
        Route::get('/', [\App\Http\Controllers\Dean\DashboardController::class, 'index'])
            ->name('dashboard');
        Route::get('terms', [\App\Http\Controllers\Dean\TermController::class, 'index'])
            ->name('terms.index');
        Route::get('terms/{term}/faculty-loads', [\App\Http\Controllers\Dean\TermFacultyLoadController::class, 'show'])
            ->name('terms.faculty-loads.show');
        Route::get('terms/{term}/faculty-loads/{facultyLoad}', [\App\Http\Controllers\Dean\TermFacultyLoadController::class, 'view'])
            ->name('terms.faculty-loads.view');
    });

require __DIR__.'/settings.php';
