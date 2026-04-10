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
        Schema::table('faculty', function (Blueprint $table): void {
            $table->dropColumn([
                'legacy_id',
                'address',
                'rank',
                'campus',
                'max_load',
                'disabled',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faculty', function (Blueprint $table): void {
            $table->string('legacy_id')->nullable();
            $table->text('address')->nullable();
            $table->string('rank')->nullable();
            $table->string('campus')->nullable();
            $table->string('max_load')->nullable();
            $table->boolean('disabled')->default(false);
        });
    }
};
