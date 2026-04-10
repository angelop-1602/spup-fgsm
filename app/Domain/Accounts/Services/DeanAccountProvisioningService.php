<?php

namespace App\Domain\Accounts\Services;

use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\User;
use App\Support\DepartmentDirectory;
use BackedEnum;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DeanAccountProvisioningService
{
    /**
     * @return array{
     *     created_accounts: list<string>,
     *     updated_accounts: list<string>,
     *     unchanged_accounts: list<string>,
     *     merged_departments: list<array{from: string, to: string}>,
     *     merged_load_conflicts: int
     * }
     */
    public function run(): array
    {
        return DB::transaction(function (): array {
            $summary = [
                'created_accounts' => [],
                'updated_accounts' => [],
                'unchanged_accounts' => [],
                'merged_departments' => [],
                'merged_load_conflicts' => 0,
            ];

            $departmentsByName = $this->ensureCanonicalDepartments();

            foreach (DepartmentDirectory::legacyDepartmentMap() as $legacyName => $targetName) {
                $legacyDepartment = $this->findDepartmentByName($legacyName);
                $targetDepartment = $departmentsByName[$targetName] ?? null;

                if ($legacyDepartment === null || $targetDepartment === null || $legacyDepartment->id === $targetDepartment->id) {
                    continue;
                }

                User::query()
                    ->where('department_id', $legacyDepartment->id)
                    ->update(['department_id' => $targetDepartment->id]);

                Faculty::query()
                    ->where('department_id', $legacyDepartment->id)
                    ->update(['department_id' => $targetDepartment->id]);

                $summary['merged_load_conflicts'] += $this->moveFacultyLoadsToDepartment(
                    $legacyDepartment->id,
                    $targetDepartment->id,
                );

                $legacyDepartment->delete();

                $summary['merged_departments'][] = [
                    'from' => $legacyName,
                    'to' => $targetName,
                ];
            }

            $departmentsByName = $this->loadCanonicalDepartments();
            $deanRole = Role::firstOrCreate(['name' => 'DEAN', 'guard_name' => 'web']);

            foreach (DepartmentDirectory::canonicalDepartments() as $departmentData) {
                $department = $departmentsByName[$departmentData['name']] ?? null;

                if ($department === null) {
                    continue;
                }

                $email = $departmentData['email'];
                $user = User::query()->where('email', $email)->first();

                if ($user === null) {
                    $user = User::query()->create([
                        'name' => DepartmentDirectory::deanNameForDepartment($departmentData['name']),
                        'email' => $email,
                        'password' => Hash::make(DepartmentDirectory::DEFAULT_DEAN_PASSWORD),
                        'department_id' => $department->id,
                        'email_verified_at' => now(),
                    ]);

                    $user->assignRole($deanRole);
                    $summary['created_accounts'][] = $email;

                    continue;
                }

                $wasUpdated = false;

                if ($user->department_id !== $department->id) {
                    $user->department_id = $department->id;
                    $wasUpdated = true;
                }

                if (! is_string($user->name) || trim($user->name) === '') {
                    $user->name = DepartmentDirectory::deanNameForDepartment($departmentData['name']);
                    $wasUpdated = true;
                }

                if ($wasUpdated) {
                    $user->save();
                    $summary['updated_accounts'][] = $email;
                }

                if (! $user->hasRole($deanRole->name)) {
                    $user->assignRole($deanRole);

                    if (! in_array($email, $summary['updated_accounts'], true)) {
                        $summary['updated_accounts'][] = $email;
                    }
                }

                if (! $wasUpdated && ! in_array($email, $summary['updated_accounts'], true)) {
                    $summary['unchanged_accounts'][] = $email;
                }
            }

            return $summary;
        });
    }

    /**
     * @return array<string, Department>
     */
    private function ensureCanonicalDepartments(): array
    {
        foreach (DepartmentDirectory::canonicalDepartments() as $departmentData) {
            $department = $this->findDepartmentByName($departmentData['name']);

            if ($department === null) {
                Department::query()->create([
                    'name' => $departmentData['name'],
                    'code' => $departmentData['code'],
                ]);

                continue;
            }

            if ($department->code === $departmentData['code']) {
                continue;
            }

            $codeIsAvailable = ! Department::query()
                ->where('code', $departmentData['code'])
                ->where('id', '!=', $department->id)
                ->exists();

            if ($codeIsAvailable) {
                $department->update(['code' => $departmentData['code']]);
            }
        }

        return $this->loadCanonicalDepartments();
    }

    /**
     * @return array<string, Department>
     */
    private function loadCanonicalDepartments(): array
    {
        /** @var array<string, Department> $departments */
        $departments = Department::query()
            ->whereIn('name', DepartmentDirectory::canonicalDepartmentNames())
            ->get()
            ->keyBy('name')
            ->all();

        return $departments;
    }

    private function findDepartmentByName(string $name): ?Department
    {
        return Department::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($name)])
            ->first();
    }

    private function moveFacultyLoadsToDepartment(int $fromDepartmentId, int $toDepartmentId): int
    {
        $mergedConflicts = 0;

        FacultyLoad::query()
            ->where('department_id', $fromDepartmentId)
            ->orderBy('id')
            ->each(function (FacultyLoad $legacyLoad) use ($toDepartmentId, &$mergedConflicts): void {
                try {
                    $legacyLoad->update(['department_id' => $toDepartmentId]);

                    return;
                } catch (QueryException $exception) {
                    if (! $this->isUniqueConstraintViolation($exception)) {
                        throw $exception;
                    }
                }

                $targetLoad = FacultyLoad::query()
                    ->where('term_id', $legacyLoad->term_id)
                    ->where('faculty_id', $legacyLoad->faculty_id)
                    ->where('department_id', $toDepartmentId)
                    ->first();

                if ($targetLoad === null) {
                    throw new \RuntimeException('Unable to resolve conflicting faculty load during department merge.');
                }

                $this->mergeFacultyLoadData($targetLoad, $legacyLoad);

                DB::table('faculty_load_items')
                    ->where('faculty_load_id', $legacyLoad->id)
                    ->update(['faculty_load_id' => $targetLoad->id]);

                DB::table('audit_logs')
                    ->where('faculty_load_id', $legacyLoad->id)
                    ->update(['faculty_load_id' => $targetLoad->id]);

                $legacyLoad->delete();
                $mergedConflicts++;
            });

        return $mergedConflicts;
    }

    private function mergeFacultyLoadData(FacultyLoad $targetLoad, FacultyLoad $sourceLoad): void
    {
        $updates = [];
        $targetStatus = $this->normalizeStatus($targetLoad->status);
        $sourceStatus = $this->normalizeStatus($sourceLoad->status);

        if ($this->statusRank($sourceStatus) > $this->statusRank($targetStatus)) {
            $updates['status'] = $sourceStatus;
        }

        if ($targetLoad->received_at === null && $sourceLoad->received_at !== null) {
            $updates['received_at'] = $sourceLoad->received_at;
            $updates['received_by_user_id'] = $sourceLoad->received_by_user_id;
        }

        if ($targetLoad->checked_at === null && $sourceLoad->checked_at !== null) {
            $updates['checked_at'] = $sourceLoad->checked_at;
            $updates['checked_by_user_id'] = $sourceLoad->checked_by_user_id;
        }

        if ((string) $targetLoad->remarks === '' && (string) $sourceLoad->remarks !== '') {
            $updates['remarks'] = $sourceLoad->remarks;
        }

        if ($updates === []) {
            return;
        }

        $targetLoad->fill($updates);
        $targetLoad->save();
    }

    private function normalizeStatus(mixed $status): string
    {
        if ($status instanceof BackedEnum) {
            return (string) $status->value;
        }

        return (string) $status;
    }

    private function statusRank(string $status): int
    {
        return match ($status) {
            'CLEARED' => 4,
            'SUBMITTED' => 3,
            'FOR_REVISION' => 2,
            default => 1,
        };
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'unique')
            || str_contains($message, 'duplicate')
            || str_contains($message, '23000');
    }
}
