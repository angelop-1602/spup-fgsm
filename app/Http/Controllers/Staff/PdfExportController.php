<?php

namespace App\Http\Controllers\Staff;

use App\Enums\FacultyLoadStatus;
use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\FacultyLoadItem;
use App\Models\SystemSetting;
use App\Models\Term;
use App\Models\User;
use App\Support\Reports\InteractsWithFacultyReports;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class PdfExportController extends Controller
{
    use InteractsWithFacultyReports;

    public function export(Request $request, Term $term): SymfonyResponse
    {
        $this->authorize('viewAny', Term::class);
        $this->authorize('viewAny', FacultyLoad::class);

        $context = $this->normalizeReportContext(
            $request->string('context', (string) ($request->route('context') ?? 'term'))->toString()
        );
        $departmentId = $request->integer('department_id');
        $status = $request->string('status')->toString();
        $empStatus = $request->string('emp_status')->toString();

        $query = $this->facultyLoadReportQuery()
            ->where('term_id', $term->id)
            ->orderByDesc('updated_at');

        if ($context === 'clearance') {
            $query->whereIn('status', [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ])->orderByRaw(
                'case when status = ? then 0 when status = ? then 1 else 2 end',
                [FacultyLoadStatus::SUBMITTED->value, FacultyLoadStatus::CLEARED->value],
            );

            if (in_array($status, [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ], true)) {
                $query->where('status', $status);
            }
        } elseif ($status !== '') {
            $query->where('status', $status);
        }

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        $this->applyEmpStatusFilter($query, $empStatus);

        $loads = $query->get();
        $this->hydrateTotalUnits($loads);

        $html = view('exports.clearance_loads', [
            'term' => $term,
            'loads' => $loads,
            'registrarName' => $this->registrarName(),
            'preparedBy' => $request->user()?->name,
            'showConfirmedBy' => true,
            'reportTitle' => $context === 'clearance'
                ? 'SPUP-Faculty Grading Sheet Management System - Clearance Report'
                : 'SPUP-Faculty Grading Sheet Management System - Faculty Loads Report',
            'statusMode' => $context,
        ])->render();

        $filename = $context === 'clearance'
            ? 'clearance-report-'.now()->format('Y-m-d-His').'.pdf'
            : 'faculty-loads-report-'.now()->format('Y-m-d-His').'.pdf';

        return Pdf::loadHTML($html)
            ->setPaper('letter', 'portrait')
            ->stream($filename);
    }

    public function exportFaculty(Request $request, Faculty $faculty): SymfonyResponse
    {
        $this->authorize('viewAny', Term::class);
        $this->authorize('viewAny', FacultyLoad::class);

        $items = $this->facultyPendingItemsQuery($faculty->id)->get();

        $html = view('exports.faculty_unsubmitted', [
            'faculty' => $faculty->load('department:id,name'),
            'items' => $items,
            'registrarName' => $this->registrarName(),
            'preparedBy' => $request->user()?->name,
            'showConfirmedBy' => true,
            'reportTitle' => 'SPUP-Faculty Grading Sheet Management System - Faculty Unsubmitted Report',
        ])->render();

        return Pdf::loadHTML($html)
            ->setPaper('letter', 'portrait')
            ->stream('faculty-unsubmitted-report-'.now()->format('Y-m-d-His').'.pdf');
    }

    private function registrarName(): ?string
    {
        $registrarName = SystemSetting::query()
            ->where('key', 'registrar_name')
            ->value('value');

        if (! is_string($registrarName) || trim($registrarName) === '') {
            $registrarName = User::query()
                ->where('email', 'registrar@spup.edu.ph')
                ->value('name');
        }

        return is_string($registrarName) ? $registrarName : null;
    }
}
