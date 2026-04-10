<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        $user = Auth::user();

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

        return redirect()->route('dashboard');
    }
}

