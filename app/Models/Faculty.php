<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faculty extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'faculty';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'faculty_code',
        'full_name',
        'middle_name',
        'call_name',
        'contact_no',
        'email',
        'emp_type',
        'emp_status',
        'supervisor',
        'department_id',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'department_id' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<FacultyLoad, $this>
     */
    public function facultyLoads(): HasMany
    {
        return $this->hasMany(FacultyLoad::class);
    }
}
