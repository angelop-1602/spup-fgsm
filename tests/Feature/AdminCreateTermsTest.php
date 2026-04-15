<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createTermsAdminUser(): User
{
    $adminRole = Role::firstOrCreate(['name' => 'ADMIN', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);

    return $admin;
}

it('previews generated terms without storing rows in the session', function (): void {
    $admin = createTermsAdminUser();

    $response = $this->actingAs($admin)
        ->post(route('admin.terms.create-batch.preview'), [
            'year_start' => 2026,
            'year_end' => 2027,
        ]);

    $response
        ->assertRedirect(route('admin.terms.create-batch.form', [
            'year_start' => 2026,
            'year_end' => 2027,
        ]))
        ->assertSessionMissing('generated_terms');
});

it('builds preview terms from query parameters', function (): void {
    $admin = createTermsAdminUser();

    $this->actingAs($admin)
        ->get(route('admin.terms.create-batch.form', [
            'year_start' => 2026,
            'year_end' => 2027,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Terms/Create')
            ->where('previewYears.year_start', 2026)
            ->where('previewYears.year_end', 2027)
            ->has('terms', 7)
            ->where('terms.0.period_code', '1ST 2026')
            ->where('terms.6.period_code', 'SUM 2027 GS'));
});
