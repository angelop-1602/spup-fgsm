<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        RedirectIfAuthenticated::redirectUsing(function ($request): string {
            $user = $request->user();

            if ($user !== null) {
                if ($user->hasRole('ADMIN')) {
                    return route('admin.dashboard');
                }

                if ($user->hasRole('REGISTRAR_STAFF')) {
                    return route('staff.dashboard');
                }

                if ($user->hasRole('DEAN')) {
                    return route('dean.dashboard');
                }
            }

            return route('dashboard');
        });
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }
}

