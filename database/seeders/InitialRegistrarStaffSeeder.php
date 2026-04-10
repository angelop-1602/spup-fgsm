<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Support\DepartmentDirectory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class InitialRegistrarStaffSeeder extends Seeder
{
    /**
     * Default password for all seeded staff users.
     * Password: Spup@12345
     */
    private const DEFAULT_PASSWORD = 'Spup@12345';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $staffRole = Role::firstOrCreate([
            'name' => 'REGISTRAR_STAFF',
            'guard_name' => 'web',
        ]);

        $staffData = [
            ['name' => 'Angeline D. Julian', 'email' => 'a.julian@spup.edu.ph', 'department' => 'GS(Graduate School)'],
            ['name' => 'Diana Rose B. Liban', 'email' => 'd.liban@spup.edu.ph', 'department' => 'SASTE'],
            ['name' => 'Heidie D. Toribio', 'email' => 'h.toribio@spup.edu.ph', 'department' => 'SBAHM'],
            ['name' => 'Jeza C. Valiente', 'email' => 'j.valiente@spup.edu.ph', 'department' => 'ETEEAP'],
            ['name' => 'Jezarene C. Valiente', 'email' => 'jc.valiente@spup.edu.ph', 'department' => 'SNAHS'],
            ['name' => 'Jonalyn D. Barasi', 'email' => 'j.barasi@spup.edu.ph', 'department' => 'SITE'],
            ['name' => 'Jyzel H. Ginez', 'email' => 'j.ginez@spup.edu.ph', 'department' => 'GS(Graduate School)'],
            ['name' => 'Kirsthen Franxyn Pagulayan', 'email' => 'k.pagulayan@spup.edu.ph', 'department' => 'SNAHS'],
        ];

        $createdUsers = [];
        $updatedUsers = [];
        $skippedUsers = [];
        $createdDepartments = [];
        $skippedDepartments = [];

        foreach ($staffData as $data) {
            $departmentName = DepartmentDirectory::canonicalNameFor($data['department']);

            // Find or create department (case-insensitive)
            $department = Department::query()
                ->whereRaw('LOWER(name) = ?', [strtolower($departmentName)])
                ->first();

            if ($department === null) {
                $department = Department::create([
                    'name' => $departmentName,
                    'code' => null,
                ]);
                $createdDepartments[] = $departmentName;
            } else {
                $skippedDepartments[] = $departmentName;
            }

            // Find or create user
            $user = User::query()->where('email', $data['email'])->first();

            if ($user === null) {
                // Create new user
                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make(self::DEFAULT_PASSWORD),
                    'department_id' => $department->id,
                    'email_verified_at' => now(),
                ]);

                $user->assignRole($staffRole);
                $createdUsers[] = $data['email'];
            } else {
                // User exists - ensure role and department
                $needsUpdate = false;

                if (! $user->hasRole($staffRole->name)) {
                    $user->assignRole($staffRole);
                    $needsUpdate = true;
                }

                // Only update department_id if it's currently null
                if ($user->department_id === null) {
                    $user->department_id = $department->id;
                    $needsUpdate = true;
                }

                if ($needsUpdate) {
                    $user->save();
                    $updatedUsers[] = $data['email'];
                } else {
                    $skippedUsers[] = $data['email'];
                }
            }
        }

        // Output summary
        $this->command->info('Initial Registrar Staff Seeder Results:');
        $this->command->line('');

        if (count($createdUsers) > 0) {
            $this->command->info('Created Users (' . count($createdUsers) . '):');
            foreach ($createdUsers as $email) {
                $this->command->line('  - ' . $email);
            }
            $this->command->line('');
        }

        if (count($updatedUsers) > 0) {
            $this->command->info('Updated Users (' . count($updatedUsers) . '):');
            foreach ($updatedUsers as $email) {
                $this->command->line('  - ' . $email);
            }
            $this->command->line('');
        }

        if (count($skippedUsers) > 0) {
            $this->command->info('Skipped Users (' . count($skippedUsers) . '):');
            foreach ($skippedUsers as $email) {
                $this->command->line('  - ' . $email);
            }
            $this->command->line('');
        }

        if (count($createdDepartments) > 0) {
            $this->command->info('Created Departments (' . count($createdDepartments) . '):');
            foreach ($createdDepartments as $name) {
                $this->command->line('  - ' . $name);
            }
            $this->command->line('');
        }

        if (count($skippedDepartments) > 0) {
            $this->command->info('Skipped Departments (' . count($skippedDepartments) . '):');
            foreach ($skippedDepartments as $name) {
                $this->command->line('  - ' . $name);
            }
            $this->command->line('');
        }

        $this->command->info('Default password for all seeded staff: ' . self::DEFAULT_PASSWORD);
    }
}
