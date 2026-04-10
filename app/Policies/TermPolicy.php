<?php

namespace App\Policies;

use App\Models\Term;
use App\Models\User;

class TermPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('ADMIN')
            || $user->hasRole('REGISTRAR_STAFF')
            || $user->hasRole('DEAN');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN')
            || $user->hasRole('REGISTRAR_STAFF')
            || $user->hasRole('DEAN');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can update the model.
     * Only allowed if term is not completed OR admin_override_unlocked=true.
     */
    public function update(User $user, Term $term): bool
    {
        if (! $user->hasRole('ADMIN')) {
            return false;
        }

        if (! config('terms.auto_lock', true)) {
            return true;
        }

        return ! $term->is_completed || $term->admin_override_unlocked;
    }

    /**
     * Determine whether the user can unlock a term.
     */
    public function unlock(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can lock a term.
     */
    public function lock(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Term $term): bool
    {
        return $user->hasRole('ADMIN');
    }
}
