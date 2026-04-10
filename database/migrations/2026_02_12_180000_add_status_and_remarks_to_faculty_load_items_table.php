<?php

use App\Enums\FacultyLoadItemStatus;
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
        Schema::table('faculty_load_items', function (Blueprint $table): void {
            $table->string('status', 32)
                ->default(FacultyLoadItemStatus::PENDING->value)
                ->after('total_units');
            $table->text('remarks')->nullable()->after('status');
            $table->index(['faculty_load_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faculty_load_items', function (Blueprint $table): void {
            $table->dropIndex('faculty_load_items_faculty_load_id_status_index');
            $table->dropColumn(['status', 'remarks']);
        });
    }
};
