<?php

namespace App\Models;

use App\Enums\FacultyLoadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * FacultyLoad represents one submission record per (term_id, faculty_id, department_id).
 *
 * IMPORTANT RULES:
 * - Import is done per selected faculty and term.
 * - department_id is inferred from the selected faculty record and may be null.
 * - Historical data may still contain multiple rows per term/faculty across departments.
 */
class FacultyLoad extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'term_id',
        'faculty_id',
        'department_id',
        'status',
        'received_at',
        'received_by_user_id',
        'checked_at',
        'checked_by_user_id',
        'remarks',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => FacultyLoadStatus::class,
            'received_at' => 'datetime',
            'checked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Term, $this>
     */
    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return BelongsTo<Faculty, $this>
     */
    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<FacultyLoadItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(FacultyLoadItem::class);
    }

    /**
     * @return HasMany<AuditLog, $this>
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
