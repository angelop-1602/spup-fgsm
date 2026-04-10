<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::firstOrCreate([
            'name' => 'ADMIN',
            'guard_name' => 'web',
        ]);

        $user = User::firstOrCreate(
            ['email' => 'registrar@spup.edu.ph'],
            [
                'name' => 'Registrar Admin',
                'password' => Hash::make('12345678'),
                'department_id' => null,
            ],
        );

        if (! $user->hasRole($adminRole->name)) {
            $user->assignRole($adminRole);
        }
    }
}

