<?php

namespace App\Domain\FacultyLoads\Services;

use App\Domain\Terms\Services\TermCompletionService;
use App\Enums\FacultyLoadStatus;
use App\Models\AuditLog;
use App\Models\FacultyLoad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Service for managing faculty load status changes and related operations.
 *
 * IMPORTANT IMPORT RULE:
 * - Import UI requires selecting term_id and faculty_id before upload.
 * - department_id is inferred from the selected faculty and may be null.
 */
class FacultyLoadStatusService
{
    public function __construct(
        private TermCompletionService $termCompletionService,
    ) {}

    public function setReceivedNow(FacultyLoad $load, User $actor): void
    {
        if ($this->termCompletionService->isLocked($load->term)) {
            throw new RuntimeException('Term is locked; cannot modify faculty load.');
        }

        DB::transaction(function () use ($load, $actor): void {
            $load->received_at = now();
            $load->received_by_user_id = $actor->id;
            $load->save();

            AuditLog::create([
                'faculty_load_id' => $load->id,
                'actor_user_id' => $actor->id,
                'action' => 'RECEIVED_SET',
                'old_status' => null,
                'new_status' => null,
                'notes' => null,
                'created_at' => now(),
            ]);
        });
    }

    public function changeStatus(FacultyLoad $load, FacultyLoadStatus $newStatus, ?string $remarks, User $actor): void
    {
        if ($this->termCompletionService->isLocked($load->term)) {
            throw new RuntimeException('Term is locked; cannot change status.');
        }

        DB::transaction(function () use ($load, $newStatus, $remarks, $actor): void {
            $trimmedRemarks = $remarks !== null ? trim($remarks) : '';

            if ($newStatus === FacultyLoadStatus::FOR_REVISION && $trimmedRemarks === '') {
                throw new InvalidArgumentException('Remarks are required when setting status to FOR_REVISION.');
            }

            if ($newStatus === FacultyLoadStatus::SUBMITTED) {
                if ($load->received_at === null) {
                    throw new InvalidArgumentException('Faculty load must be marked as received before submitting.');
                }
            }

            $oldStatus = $load->status;

            $load->status = $newStatus;

            if ($newStatus === FacultyLoadStatus::FOR_REVISION || $newStatus === FacultyLoadStatus::SUBMITTED) {
                $load->checked_at = now();
                $load->checked_by_user_id = $actor->id;
            }

            $load->remarks = $remarks;
            $load->save();

            AuditLog::create([
                'faculty_load_id' => $load->id,
                'actor_user_id' => $actor->id,
                'action' => 'STATUS_CHANGED',
                'old_status' => $oldStatus?->value,
                'new_status' => $newStatus->value,
                'notes' => $remarks,
                'created_at' => now(),
            ]);

            $this->termCompletionService->recalculate($load->term, $actor);
        });
    }
}
