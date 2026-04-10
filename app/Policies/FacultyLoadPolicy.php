<?php

namespace App\Policies;

use App\Models\FacultyLoad;
use App\Models\User;

class FacultyLoadPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        if ($user->hasRole('ADMIN') || $user->hasRole('REGISTRAR_STAFF')) {
            return true;
        }

        return $user->hasRole('DEAN');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, FacultyLoad $facultyLoad): bool
    {
        if ($user->hasRole('ADMIN') || $user->hasRole('REGISTRAR_STAFF')) {
            return true;
        }

        if (! $user->hasRole('DEAN')) {
            return false;
        }

        if ($user->department_id === null) {
            return false;
        }

        return $facultyLoad->department_id === $user->department_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('ADMIN') || $user->hasRole('REGISTRAR_STAFF');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, FacultyLoad $facultyLoad): bool
    {
        if ($user->hasRole('ADMIN')) {
            return true;
        }

        if ($user->hasRole('REGISTRAR_STAFF')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, FacultyLoad $facultyLoad): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, FacultyLoad $facultyLoad): bool
    {
        return $user->hasRole('ADMIN');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, FacultyLoad $facultyLoad): bool
    {
        return $user->hasRole('ADMIN');
    }
}
