<?php

namespace App\Domain\Terms\Services;

use App\Enums\FacultyLoadStatus;
use App\Models\Term;
use App\Models\User;

class TermCompletionService
{
    public function recalculate(Term $term, User $actor): void
    {
        $total = $term->facultyLoads()->count();
        $completed = $term->facultyLoads()
            ->whereIn('status', [
                FacultyLoadStatus::SUBMITTED->value,
                FacultyLoadStatus::CLEARED->value,
            ])
            ->count();

        if ($total > 0 && $completed === $total) {
            $term->is_completed = true;
            $term->completed_at = now();
            $term->completed_by_user_id = $actor->id;
        } else {
            $term->is_completed = false;
            $term->completed_at = null;
            $term->completed_by_user_id = null;
        }

        $term->save();
    }

    public function isLocked(Term $term): bool
    {
        if (! config('terms.auto_lock', true)) {
            return false;
        }

        return $term->is_completed && ! $term->admin_override_unlocked;
    }
}
