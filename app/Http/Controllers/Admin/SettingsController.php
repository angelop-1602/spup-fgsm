<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Accounts\Services\DeanAccountProvisioningService;
use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\DepartmentDirectory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        return Inertia::render('Admin/Settings/Index');
    }

    public function system(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        return Inertia::render('settings/system', [
            'deanAccounts' => collect(DepartmentDirectory::canonicalDepartments())
                ->map(fn (array $row): array => [
                    'department' => $row['name'],
                    'email' => $row['email'],
                    'default_password' => DepartmentDirectory::DEFAULT_DEAN_PASSWORD,
                ])
                ->values(),
            'registrarName' => SystemSetting::query()
                ->where('key', 'registrar_name')
                ->value('value'),
            'successMessage' => $request->session()->get('success'),
        ]);
    }

    public function generateDeans(DeanAccountProvisioningService $service): RedirectResponse
    {
        $this->authorize('viewAny', User::class);

        $summary = $service->run();

        $message = sprintf(
            'Dean accounts synced. Created: %d, Updated: %d, Unchanged: %d. Department merges: %d, Load conflicts resolved: %d.',
            count($summary['created_accounts']),
            count($summary['updated_accounts']),
            count($summary['unchanged_accounts']),
            count($summary['merged_departments']),
            $summary['merged_load_conflicts'],
        );

        return redirect()
            ->route('system.index')
            ->with('success', $message);
    }

    public function updateRegistrar(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', User::class);

        $validated = $request->validate([
            'registrar_name' => ['nullable', 'string', 'max:255'],
        ]);

        $registrarName = trim((string) ($validated['registrar_name'] ?? ''));

        SystemSetting::query()->updateOrCreate(
            ['key' => 'registrar_name'],
            ['value' => $registrarName === '' ? null : $registrarName],
        );

        return redirect()
            ->route('system.index')
            ->with('success', 'University registrar name updated.');
    }
}
