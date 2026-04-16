<?php

namespace App\Models;

use App\Enums\FacultyLoadStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Term extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'school_unit',
        'year_start',
        'year_end',
        'academic_year',
        'term_name',
        'period_code',
        'display_code',
        'is_active',
        'is_completed',
        'completed_at',
        'completed_by_user_id',
        'admin_override_unlocked',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year_start' => 'integer',
            'year_end' => 'integer',
            'is_active' => 'boolean',
            'is_completed' => 'boolean',
            'admin_override_unlocked' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<FacultyLoad, $this>
     */
    public function facultyLoads(): HasMany
    {
        return $this->hasMany(FacultyLoad::class);
    }

    /**
     * @param  Builder<Term>  $query
     * @return Builder<Term>
     */
    public function scopeWithCompletionCounts(Builder $query): Builder
    {
        return $query->withCount([
            'facultyLoads as total_loads',
            'facultyLoads as completed_loads' => function ($countQuery): void {
                $countQuery->whereIn('status', [
                    FacultyLoadStatus::SUBMITTED->value,
                    FacultyLoadStatus::CLEARED->value,
                ]);
            },
        ]);
    }

    public function loadCompletionCounts(): static
    {
        $this->loadCount([
            'facultyLoads as total_loads',
            'facultyLoads as completed_loads' => function ($countQuery): void {
                $countQuery->whereIn('status', [
                    FacultyLoadStatus::SUBMITTED->value,
                    FacultyLoadStatus::CLEARED->value,
                ]);
            },
        ]);

        return $this;
    }
}
