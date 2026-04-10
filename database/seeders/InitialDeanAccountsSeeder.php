<?php

namespace Database\Seeders;

use App\Domain\Accounts\Services\DeanAccountProvisioningService;
use Illuminate\Database\Seeder;

class InitialDeanAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $summary = app(DeanAccountProvisioningService::class)->run();

        if ($this->command === null) {
            return;
        }

        $this->command->info('Initial Dean Accounts Seeder Results:');
        $this->command->line('');
        $this->command->line('Created accounts: '.count($summary['created_accounts']));
        $this->command->line('Updated accounts: '.count($summary['updated_accounts']));
        $this->command->line('Unchanged accounts: '.count($summary['unchanged_accounts']));
        $this->command->line('Merged departments: '.count($summary['merged_departments']));
        $this->command->line('Resolved load conflicts: '.$summary['merged_load_conflicts']);
    }
}
