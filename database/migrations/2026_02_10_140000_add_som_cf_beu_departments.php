<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $departments = [
            ['name' => 'SOM', 'code' => 'SOM'],
            ['name' => 'CF', 'code' => 'CF'],
            ['name' => 'BEU', 'code' => 'BEU'],
        ];

        foreach ($departments as $department) {
            $existingByName = DB::table('departments')
                ->whereRaw('LOWER(name) = ?', [strtolower($department['name'])])
                ->first();

            if ($existingByName !== null) {
                if (empty($existingByName->code)) {
                    DB::table('departments')
                        ->where('id', $existingByName->id)
                        ->update([
                            'code' => $department['code'],
                            'updated_at' => now(),
                        ]);
                }

                continue;
            }

            $existingByCode = DB::table('departments')
                ->whereRaw('LOWER(code) = ?', [strtolower($department['code'])])
                ->first();

            if ($existingByCode !== null) {
                continue;
            }

            DB::table('departments')->insert([
                'name' => $department['name'],
                'code' => $department['code'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally left blank because departments may already be referenced by users/faculty.
    }
};
