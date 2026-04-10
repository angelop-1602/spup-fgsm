<?php

use App\Domain\Terms\Services\CreateTermsService;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('generates correct college codes for AY 2026-2027', function (): void {
    /** @var CreateTermsService $service */
    $service = app(CreateTermsService::class);

    $rows = $service->buildDraft(2026, 2027, true, false);
    $normalized = $service->validateDraft($rows);

    $college = collect($normalized)->where('school_unit', 'COLLEGE')->values();

    expect($college)->toHaveCount(3);

    expect($college->pluck('period_code')->all())->toBe([
        '1ST 2026',
        '2ND 2026',
        'SUM 2027 COL',
    ]);

    expect($college->pluck('term_name')->all())->toBe([
        'First Semester',
        'Second Semester',
        'Summer',
    ]);

    expect($college->pluck('display_code')->all())->toBe([
        '1ST 2026',
        '2ND 2026',
        'SUM 2026 - 2027',
    ]);
});

it('generates correct graduate codes for AY 2026-2027', function (): void {
    /** @var CreateTermsService $service */
    $service = app(CreateTermsService::class);

    $rows = $service->buildDraft(2026, 2027, false, true);
    $normalized = $service->validateDraft($rows);

    $grad = collect($normalized)->where('school_unit', 'GRADUATE')->values();

    expect($grad)->toHaveCount(4);

    expect($grad->pluck('period_code')->all())->toBe([
        '1T2026',
        '2T2026',
        '3T2026',
        'SUM 2027 GS',
    ]);

    expect($grad->pluck('term_name')->all())->toBe([
        'First Trimester',
        'Second Trimester',
        'Third Trimester',
        'Summer',
    ]);

    expect($grad->pluck('display_code')->all())->toBe([
        '1T2026',
        '2T2026',
        '3T2026',
        'SUM 2026 - 2027',
    ]);
});

it('commits generated terms with exact values', function (): void {
    /** @var CreateTermsService $service */
    $service = app(CreateTermsService::class);

    $rows = $service->buildDraft(2026, 2027, true, true);
    $normalized = $service->validateDraft($rows);

    $actor = User::factory()->create();

    $service->commitDraft($normalized, $actor);

    expect(Term::query()->count())->toBe(7);

    $this->assertDatabaseHas('terms', [
        'school_unit' => 'COLLEGE',
        'year_start' => 2026,
        'year_end' => 2027,
        'academic_year' => '2026-2027',
        'term_name' => 'First Semester',
        'period_code' => '1ST 2026',
        'display_code' => '1ST 2026',
    ]);

    $this->assertDatabaseHas('terms', [
        'school_unit' => 'COLLEGE',
        'term_name' => 'Summer',
        'period_code' => 'SUM 2027 COL',
        'display_code' => 'SUM 2026 - 2027',
    ]);

    $this->assertDatabaseHas('terms', [
        'school_unit' => 'GRADUATE',
        'term_name' => 'Third Trimester',
        'period_code' => '3T2026',
        'display_code' => '3T2026',
    ]);

    $this->assertDatabaseHas('terms', [
        'school_unit' => 'GRADUATE',
        'term_name' => 'Summer',
        'period_code' => 'SUM 2027 GS',
        'display_code' => 'SUM 2026 - 2027',
    ]);
});

