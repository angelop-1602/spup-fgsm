<?php

use App\Models\Department;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('admin can access only admin section', function (): void {
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);

    /** @var User $admin */
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    $this->actingAs($admin);

    $this->get('/admin')->assertOk();
    $this->get('/staff')->assertForbidden();
    $this->get('/dean')->assertForbidden();
});

test('registrar staff can access only staff section', function (): void {
    $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);

    /** @var User $staff */
    $staff = User::factory()->create();
    $staff->assignRole($staffRole);

    $this->actingAs($staff);

    $this->get('/staff')->assertOk();
    $this->get('/admin')->assertForbidden();
    $this->get('/dean')->assertForbidden();
});

test('dean can access only dean section', function (): void {
    $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

    /** @var Department $department */
    $department = Department::create([
        'name' => 'Dean Department',
        'code' => 'DEAN',
    ]);

    /** @var User $dean */
    $dean = User::factory()->create([
        'department_id' => $department->id,
    ]);
    $dean->assignRole($deanRole);

    $this->actingAs($dean);

    $this->get('/dean')->assertOk();
    $this->get('/admin')->assertForbidden();
    $this->get('/staff')->assertForbidden();
});
