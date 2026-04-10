<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserStoreRequest;
use App\Http\Requests\Admin\UserUpdateRequest;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class DeanController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $search = (string) $request->input('q', '');

        $query = User::query()
            ->with('department')
            ->whereHas('roles', function ($q): void {
                $q->where('name', 'DEAN');
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        $users = $query
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Deans/Index', [
            'users' => $users,
            'filters' => [
                'q' => $search,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', User::class);

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Deans/Create', [
            'departments' => $departments,
        ]);
    }

    public function store(UserStoreRequest $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validated();

        // Force role to DEAN and require department
        if (empty($data['department_id'])) {
            return redirect()
                ->back()
                ->withErrors(['department_id' => 'Department is required for Deans.'])
                ->withInput();
        }

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make('Spup@12345'),
            'department_id' => $data['department_id'],
        ]);

        $user->assignRole('DEAN');

        return redirect()
            ->route('admin.deans.index')
            ->with('success', 'Dean created with default password.');
    }

    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        if (! $user->hasRole('DEAN')) {
            abort(404);
        }

        $user->load('department');

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Deans/Edit', [
            'user' => $user,
            'departments' => $departments,
        ]);
    }

    public function update(UserUpdateRequest $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        if (! $user->hasRole('DEAN')) {
            abort(404);
        }

        $data = $request->validated();

        // Ensure role is DEAN and department is set
        $data['role'] = 'DEAN';
        if (empty($data['department_id'])) {
            return redirect()
                ->back()
                ->withErrors(['department_id' => 'Department is required for Deans.'])
                ->withInput();
        }

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'department_id' => $data['department_id'],
        ]);

        if (! $user->hasRole('DEAN')) {
            $user->syncRoles(['DEAN']);
        }

        return redirect()
            ->route('admin.deans.index')
            ->with('success', 'Dean updated successfully.');
    }

    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        if (! $user->hasRole('DEAN')) {
            abort(404);
        }

        $user->delete();

        return redirect()
            ->route('admin.deans.index')
            ->with('success', 'Dean deleted successfully.');
    }
}
