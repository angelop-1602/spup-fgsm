<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->dropForeign(['department_id']);
        });

        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->unsignedBigInteger('department_id')->nullable()->change();
        });

        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->dropForeign(['department_id']);
        });

        $fallbackDepartmentId = DB::table('departments')
            ->orderBy('id')
            ->value('id');

        if ($fallbackDepartmentId === null) {
            throw new RuntimeException('Cannot revert faculty_loads.department_id to non-null without any department records.');
        }

        DB::table('faculty_loads')
            ->whereNull('department_id')
            ->update(['department_id' => $fallbackDepartmentId]);

        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->unsignedBigInteger('department_id')->nullable(false)->change();
        });

        Schema::table('faculty_loads', function (Blueprint $table): void {
            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->cascadeOnDelete();
        });
    }
};
