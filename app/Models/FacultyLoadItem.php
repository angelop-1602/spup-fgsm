<?php

namespace App\Models;

use App\Enums\FacultyLoadItemStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacultyLoadItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'faculty_load_id',
        'subject_id',
        'subject_code',
        'section',
        'schedule',
        'room',
        'units_lec',
        'units_lab',
        'total_units',
        'status',
        'remarks',
        'raw_payload_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => FacultyLoadItemStatus::class,
            'raw_payload_json' => 'array',
        ];
    }

    /**
     * @return BelongsTo<FacultyLoad, $this>
     */
    public function facultyLoad(): BelongsTo
    {
        return $this->belongsTo(FacultyLoad::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
