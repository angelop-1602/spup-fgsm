<?php

use App\Domain\FacultyLoads\Services\FacultyLoadStatusService;
use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createBasicGraph(): array
{
    /** @var Department $department */
    $department = Department::create([
        'name' => 'Department of Testing',
        'code' => 'TEST',
    ]);

    /** @var Term $term */
    $term = Term::create([
        'academic_year' => '2025-2026',
        'term_name' => '1st Sem',
        'is_active' => true,
    ]);

    /** @var Faculty $faculty */
    $faculty = Faculty::create([
        'faculty_code' => 'F001',
        'full_name' => 'Test Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var FacultyLoad $load */
    $load = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $faculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    /** @var User $actor */
    $actor = User::factory()->create();

    return compact('department', 'term', 'faculty', 'load', 'actor');
}

test('FOR_REVISION requires remarks', function (): void {
    ['load' => $load, 'actor' => $actor] = createBasicGraph();

    /** @var FacultyLoadStatusService $service */
    $service = app(FacultyLoadStatusService::class);

    expect(fn () => $service->changeStatus($load, FacultyLoadStatus::FOR_REVISION, null, $actor))
        ->toThrow(\InvalidArgumentException::class);
});

test('SUBMITTED requires received_at', function (): void {
    ['load' => $load, 'actor' => $actor] = createBasicGraph();

    /** @var FacultyLoadStatusService $service */
    $service = app(FacultyLoadStatusService::class);

    expect(fn () => $service->changeStatus($load, FacultyLoadStatus::SUBMITTED, 'ok', $actor))
        ->toThrow(\InvalidArgumentException::class);
});

test('term auto completes when all loads submitted', function (): void {
    ['department' => $department, 'term' => $term, 'faculty' => $faculty, 'load' => $existingLoad, 'actor' => $actor] = createBasicGraph();

    /** @var Faculty $otherFaculty */
    $otherFaculty = Faculty::create([
        'faculty_code' => 'F002',
        'full_name' => 'Second Faculty',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    /** @var FacultyLoad $load2 */
    $load2 = FacultyLoad::create([
        'term_id' => $term->id,
        'faculty_id' => $otherFaculty->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    /** @var FacultyLoadStatusService $service */
    $service = app(FacultyLoadStatusService::class);

    // No required checklist; only enforce received_at
    $service->setReceivedNow($existingLoad, $actor);
    $service->changeStatus($existingLoad->fresh(), FacultyLoadStatus::SUBMITTED, 'ok', $actor);

    $term->refresh();
    expect($term->is_completed)->toBeFalse();

    $service->setReceivedNow($load2, $actor);
    $service->changeStatus($load2->fresh(), FacultyLoadStatus::SUBMITTED, 'ok', $actor);

    $term->refresh();
    expect($term->is_completed)->toBeTrue()
        ->and($term->completed_by_user_id)->toBe($actor->id)
        ->and($term->completed_at)->not->toBeNull();
});

test('inactive term blocks status changes until reactivated', function (): void {
    ['load' => $load, 'term' => $term, 'actor' => $actor] = createBasicGraph();

    $term->is_active = false;
    $term->save();

    /** @var FacultyLoadStatusService $service */
    $service = app(FacultyLoadStatusService::class);

    expect(fn () => $service->changeStatus($load->fresh(), FacultyLoadStatus::FOR_REVISION, 'remarks', $actor))
        ->toThrow(\RuntimeException::class);

    $term->is_active = true;
    $term->save();

    $service->changeStatus($load->fresh(), FacultyLoadStatus::FOR_REVISION, 'remarks', $actor);

    $load->refresh();
    expect($load->status)->toBe(FacultyLoadStatus::FOR_REVISION);
});
