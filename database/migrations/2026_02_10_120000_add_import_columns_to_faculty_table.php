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
            $table->string('legacy_id')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('call_name')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_no')->nullable();
            $table->string('email')->nullable();
            $table->string('emp_type')->nullable();
            $table->string('emp_status')->nullable();
            $table->string('rank')->nullable();
            $table->string('supervisor')->nullable();
            $table->string('campus')->nullable();
            $table->string('max_load')->nullable();
            $table->boolean('disabled')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faculty', function (Blueprint $table): void {
            $table->dropColumn([
                'legacy_id',
                'middle_name',
                'call_name',
                'address',
                'contact_no',
                'email',
                'emp_type',
                'emp_status',
                'rank',
                'supervisor',
                'campus',
                'max_load',
                'disabled',
            ]);
        });
    }
};
