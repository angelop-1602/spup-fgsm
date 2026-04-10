<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);
        $staffRole = Role::firstOrCreate(['name' => 'REGISTRAR_STAFF', 'guard_name' => 'web']);
        $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

        $permissions = [
            'admin.manage_terms',
            'admin.manage_masterdata',
            'admin.manage_users',
            'admin.view_audit_logs',
            'reports.export',
            'staff.import_loads',
            'staff.update_submissions',
            'dean.view_department_dashboard',
        ];

        $permissionModels = collect($permissions)->mapWithKeys(function (string $name): array {
            $permission = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);

            return [$name => $permission];
        });

        $adminRole->syncPermissions($permissionModels->values());
        $staffRole->syncPermissions([
            $permissionModels['staff.import_loads'],
            $permissionModels['staff.update_submissions'],
        ]);
        $deanRole->syncPermissions([
            $permissionModels['dean.view_department_dashboard'],
        ]);
    }
}
