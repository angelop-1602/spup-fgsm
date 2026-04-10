<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('terms', function (Blueprint $table): void {
            $table->string('school_unit', 32)->default('COLLEGE')->after('id');
            $table->integer('year_start')->nullable()->after('school_unit');
            $table->integer('year_end')->nullable()->after('year_start');
            $table->string('period_code', 64)->nullable()->after('term_name');
            $table->string('display_code', 64)->nullable()->after('period_code');
            $table->boolean('is_active')->default(false)->after('display_code');

            $table->unique(['school_unit', 'period_code']);
            $table->unique(['school_unit', 'year_start', 'year_end', 'term_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terms', function (Blueprint $table): void {
            $table->dropUnique(['school_unit', 'period_code']);
            $table->dropUnique(['school_unit', 'year_start', 'year_end', 'term_name']);

            $table->dropColumn([
                'school_unit',
                'year_start',
                'year_end',
                'period_code',
                'display_code',
                'is_active',
            ]);
        });
    }
};

