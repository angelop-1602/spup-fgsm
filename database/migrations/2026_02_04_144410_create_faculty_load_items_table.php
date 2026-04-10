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
        Schema::create('faculty_load_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faculty_load_id')->constrained('faculty_loads')->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('subject_code')->nullable();
            $table->string('section')->nullable();
            $table->string('schedule')->nullable();
            $table->string('room')->nullable();
            $table->decimal('units_lec', 5, 2)->nullable();
            $table->decimal('units_lab', 5, 2)->nullable();
            $table->decimal('total_units', 5, 2)->nullable();
            $table->json('raw_payload_json');
            $table->timestamps();

            $table->index('faculty_load_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faculty_load_items');
    }
};
