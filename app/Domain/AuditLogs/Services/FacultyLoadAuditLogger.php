<?php

namespace App\Domain\AuditLogs\Services;

use App\Enums\FacultyLoadStatus;
use App\Models\AuditLog;
use App\Models\FacultyLoad;
use App\Models\FacultyLoadItem;
use App\Models\User;

class FacultyLoadAuditLogger
{
    public const ACTION_ITEM_STATUS_UPDATED = 'ITEM_STATUS_UPDATED';

    public const ACTION_IMPORT_CREATED = 'FACULTY_LOAD_IMPORT_CREATED';

    public const ACTION_IMPORT_UPDATED = 'FACULTY_LOAD_IMPORT_UPDATED';

    public function logItemStatusUpdated(
        FacultyLoad $load,
        FacultyLoadItem $item,
        User $actor,
        ?string $oldItemStatus,
        string $newItemStatus,
        ?string $oldLoadStatus,
        ?string $newLoadStatus,
        ?string $remarks = null,
    ): void {
        $subjectCode = trim((string) ($item->subject_code ?? ''));
        $section = trim((string) ($item->section ?? ''));
        $normalizedRemarks = trim((string) $remarks);
        $normalizedOldLoadStatus = trim((string) $oldLoadStatus);
        $normalizedNewLoadStatus = trim((string) $newLoadStatus);

        $notesParts = [
            'subject='.($subjectCode === '' ? '-' : $subjectCode),
            'section='.($section === '' ? '-' : $section),
        ];

        if (
            $normalizedOldLoadStatus !== ''
            && $normalizedNewLoadStatus !== ''
            && $normalizedOldLoadStatus !== $normalizedNewLoadStatus
        ) {
            $notesParts[] = 'load_status='.$normalizedOldLoadStatus.'->'.$normalizedNewLoadStatus;
        }

        if ($normalizedRemarks !== '') {
            $notesParts[] = 'remarks='.$normalizedRemarks;
        }

        AuditLog::query()->create([
            'faculty_load_id' => $load->id,
            'actor_user_id' => $actor->id,
            'action' => self::ACTION_ITEM_STATUS_UPDATED,
            'old_status' => $oldItemStatus,
            'new_status' => $newItemStatus,
            'notes' => implode(' | ', $notesParts),
            'created_at' => now(),
        ]);
    }

    public function logImport(
        FacultyLoad $load,
        User $actor,
        bool $isUpdate,
        ?string $oldLoadStatus,
        int $importedRows,
        int $skippedRows,
        int $headerRow,
        int $replacedRows,
        string $fileName,
    ): void {
        $action = $isUpdate ? self::ACTION_IMPORT_UPDATED : self::ACTION_IMPORT_CREATED;
        $safeFileName = trim($fileName) === '' ? 'uploaded-file' : trim($fileName);

        AuditLog::query()->create([
            'faculty_load_id' => $load->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'old_status' => $oldLoadStatus,
            'new_status' => FacultyLoadStatus::PENDING->value,
            'notes' => implode(' | ', [
                "file={$safeFileName}",
                "imported_rows={$importedRows}",
                "skipped_rows={$skippedRows}",
                "header_row={$headerRow}",
                "replaced_rows={$replacedRows}",
            ]),
            'created_at' => now(),
        ]);
    }
}
