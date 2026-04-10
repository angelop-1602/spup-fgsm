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
        DB::table('faculty_load_items')
            ->select(['id', 'raw_payload_json'])
            ->orderBy('id')
            ->chunkById(500, function ($items): void {
                foreach ($items as $item) {
                    $payload = json_decode((string) $item->raw_payload_json, true);

                    if (! is_array($payload)) {
                        continue;
                    }

                    $hasIgnoredKeys = false;

                    foreach (['merged_to', 'special', 'petitioned', 'dissolved'] as $key) {
                        if (array_key_exists($key, $payload)) {
                            unset($payload[$key]);
                            $hasIgnoredKeys = true;
                        }
                    }

                    if (! $hasIgnoredKeys) {
                        continue;
                    }

                    DB::table('faculty_load_items')
                        ->where('id', $item->id)
                        ->update([
                            'raw_payload_json' => json_encode($payload),
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible data cleanup migration.
    }
};
