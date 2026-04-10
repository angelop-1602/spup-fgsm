<?php

namespace App\Support;

class DepartmentDirectory
{
    public const DEFAULT_DEAN_PASSWORD = 'Spup@12345';

    /**
     * @return list<array{name: string, code: string, email: string}>
     */
    public static function canonicalDepartments(): array
    {
        return [
            ['name' => 'GS(Graduate School)', 'code' => 'GS', 'email' => 'gs@spup.edu.ph'],
            ['name' => 'SASTE', 'code' => 'SASTE', 'email' => 'saste@spup.edu.ph'],
            ['name' => 'SBAHM', 'code' => 'SBAHM', 'email' => 'sbahm@spup.edu.ph'],
            ['name' => 'ETEEAP', 'code' => 'ETEEAP', 'email' => 'eteeap@spup.edu.ph'],
            ['name' => 'SNAHS', 'code' => 'SNAHS', 'email' => 'snahs@spup.edu.ph'],
            ['name' => 'SITE', 'code' => 'SITE', 'email' => 'site@spup.edu.ph'],
            ['name' => 'SOM', 'code' => 'SOM', 'email' => 'som@spup.edu.ph'],
            ['name' => 'CF', 'code' => 'CF', 'email' => 'cf@spup.edu.ph'],
            ['name' => 'BEU', 'code' => 'BEU', 'email' => 'beu@spup.edu.ph'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function legacyDepartmentMap(): array
    {
        return [
            'GS(Doctoral)' => 'GS(Graduate School)',
            'GS(Masters)' => 'GS(Graduate School)',
            'SNAHS(Allied)' => 'SNAHS',
            'SNAHS(Nursing)' => 'SNAHS',
        ];
    }

    /**
     * @return list<string>
     */
    public static function canonicalDepartmentNames(): array
    {
        return array_column(self::canonicalDepartments(), 'name');
    }

    public static function canonicalNameFor(string $name): string
    {
        return self::legacyDepartmentMap()[$name] ?? $name;
    }

    public static function deanNameForDepartment(string $departmentName): string
    {
        return 'Dean - '.$departmentName;
    }
}
