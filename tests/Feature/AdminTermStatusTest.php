<?php

use App\Enums\FacultyLoadStatus;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\FacultyLoad;
use App\Models\Term;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createUserWithRole(string $roleName): User
{
    $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

    /** @var User $user */
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

/**
 * @return array<int, array{role: string, route: string, component: string}>
 */
function termIndexContexts(): array
{
    return [
        [
            'role' => 'ADMIN',
            'route' => 'admin.terms.index',
            'component' => 'Admin/Terms/Index',
        ],
        [
            'role' => 'REGISTRAR_STAFF',
            'route' => 'staff.terms.index',
            'component' => 'Staff/Terms/Index',
        ],
        [
            'role' => 'DEAN',
            'route' => 'dean.terms.index',
            'component' => 'Dean/Terms/Index',
        ],
    ];
}

function createListedTerm(string $academicYear, string $termName, string $periodCode): Term
{
    return Term::create([
        'academic_year' => $academicYear,
        'term_name' => $termName,
        'period_code' => $periodCode,
        'is_active' => true,
    ]);
}

/**
 * @return array<int, mixed>
 */
function normalizeInertiaArray(mixed $value): array
{
    return is_array($value) ? $value : $value->all();
}

test('admin can update a term active status', function (): void {
    $admin = createUserWithRole('ADMIN');

    $term = createListedTerm('2025-2026', 'First Semester', '1S-2025-2026');

    $this->actingAs($admin)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'INACTIVE',
        ])
        ->assertRedirect(route('admin.terms.index'));

    expect($term->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'ACTIVE',
        ])
        ->assertRedirect(route('admin.terms.index'));

    expect($term->fresh()->is_active)->toBeTrue();
});

test('non admin cannot update a term active status', function (): void {
    $staff = createUserWithRole('REGISTRAR_STAFF');

    $term = createListedTerm('2025-2026', 'Second Semester', '2S-2025-2026');

    $this->actingAs($staff)
        ->patch(route('admin.terms.status', ['term' => $term->id]), [
            'status' => 'INACTIVE',
        ])
        ->assertForbidden();
});

test('term index pages default to grouped listings with completion counts', function (): void {
    $department = Department::create([
        'name' => 'School of Information Technology and Engineering',
        'code' => 'SITE',
    ]);

    $facultyOne = Faculty::create([
        'faculty_code' => 'SITE-001',
        'full_name' => 'Faculty One',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $facultyTwo = Faculty::create([
        'faculty_code' => 'SITE-002',
        'full_name' => 'Faculty Two',
        'department_id' => $department->id,
        'status' => 'ACTIVE',
    ]);

    $groupedTerm = createListedTerm('2025-2026', 'First Semester', '1S-2025-2026');
    createListedTerm('2024-2025', 'Second Semester', '2S-2024-2025');

    FacultyLoad::create([
        'term_id' => $groupedTerm->id,
        'faculty_id' => $facultyOne->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::SUBMITTED,
    ]);

    FacultyLoad::create([
        'term_id' => $groupedTerm->id,
        'faculty_id' => $facultyTwo->id,
        'department_id' => $department->id,
        'status' => FacultyLoadStatus::PENDING,
    ]);

    foreach (termIndexContexts() as $context) {
        $this->actingAs(createUserWithRole($context['role']))
            ->get(route($context['route']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'grouped')
                ->where('latest_academic_year', '2025-2026')
                ->where('grouped_terms.data.0.academic_year', '2025-2026')
                ->where('grouped_terms.data.0.terms.0.total_loads', 2)
                ->where('grouped_terms.data.0.terms.0.completed_loads', 1)
            );
    }
});

test('term index pages keep academic years intact across grouped pagination', function (): void {
    foreach (range(2010, 2026) as $yearStart) {
        $academicYear = sprintf('%d-%d', $yearStart, $yearStart + 1);
        createListedTerm($academicYear, 'First Semester', '1S-'.$academicYear);
        createListedTerm($academicYear, 'Second Semester', '2S-'.$academicYear);
    }

    foreach (termIndexContexts() as $context) {
        $pageOneYears = [];

        $this->actingAs(createUserWithRole($context['role']))
            ->get(route($context['route']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'grouped')
                ->where('grouped_terms.data', function ($groups) use (&$pageOneYears): bool {
                    $groups = normalizeInertiaArray($groups);

                    if ($groups === []) {
                        return false;
                    }

                    $pageOneYears = array_map(
                        static fn (array $group): string => (string) $group['academic_year'],
                        $groups,
                    );

                    if (count($pageOneYears) !== count(array_unique($pageOneYears))) {
                        return false;
                    }

                    foreach ($groups as $group) {
                        $terms = normalizeInertiaArray($group['terms'] ?? []);

                        if ($terms === []) {
                            return false;
                        }

                        foreach ($terms as $term) {
                            if (($term['academic_year'] ?? null) !== $group['academic_year']) {
                                return false;
                            }
                        }
                    }

                    return true;
                })
            );

        $pageTwoYears = [];

        $this->actingAs(createUserWithRole($context['role']))
            ->get(route($context['route'], ['page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'grouped')
                ->where('grouped_terms.data', function ($groups) use (&$pageTwoYears): bool {
                    $groups = normalizeInertiaArray($groups);

                    if ($groups === []) {
                        return false;
                    }

                    $pageTwoYears = array_map(
                        static fn (array $group): string => (string) $group['academic_year'],
                        $groups,
                    );

                    foreach ($groups as $group) {
                        $terms = normalizeInertiaArray($group['terms'] ?? []);

                        if ($terms === []) {
                            return false;
                        }

                        foreach ($terms as $term) {
                            if (($term['academic_year'] ?? null) !== $group['academic_year']) {
                                return false;
                            }
                        }
                    }

                    return true;
                })
            );

        expect(array_intersect($pageOneYears, $pageTwoYears))->toBe([]);
    }
});

test('term index pages switch to flat search results for code academic year and term name', function (): void {
    createListedTerm('2025-2026', 'Alpha Semester', 'ALPHA-2025');
    createListedTerm('2024-2025', 'Beta Semester', 'BETA-2024');
    createListedTerm('2023-2024', 'Gamma Practicum', 'GAMMA-2023');

    foreach (termIndexContexts() as $context) {
        $user = createUserWithRole($context['role']);

        $this->actingAs($user)
            ->get(route($context['route'], ['q' => 'ALPHA']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'flat')
                ->where('terms.data.0.period_code', 'ALPHA-2025')
            );

        $this->actingAs($user)
            ->get(route($context['route'], ['q' => '2024-2025']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'flat')
                ->where('terms.data.0.academic_year', '2024-2025')
            );

        $this->actingAs($user)
            ->get(route($context['route'], ['q' => 'Practicum']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'flat')
                ->where('terms.data.0.term_name', 'Gamma Practicum')
            );
    }
});

test('term index search results stay ordered by latest academic year first', function (): void {
    createListedTerm('2025-2026', 'Shared Semester', 'SHARED-2025');
    createListedTerm('2023-2024', 'Shared Semester', 'SHARED-2023');
    createListedTerm('2024-2025', 'Shared Semester', 'SHARED-2024');

    foreach (termIndexContexts() as $context) {
        $this->actingAs(createUserWithRole($context['role']))
            ->get(route($context['route'], [
                'q' => 'Shared Semester',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component($context['component'])
                ->where('listing_mode', 'flat')
                ->where('latest_academic_year', '2025-2026')
                ->where('terms.data.0.academic_year', '2025-2026')
                ->where('terms.data.1.academic_year', '2024-2025')
                ->where('terms.data.2.academic_year', '2023-2024')
            );
    }
});
