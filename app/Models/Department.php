<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
    ];

    /**
     * @return HasMany<Faculty, $this>
     */
    public function faculty(): HasMany
    {
        return $this->hasMany(Faculty::class);
    }

    /**
     * @return HasMany<FacultyLoad, $this>
     */
    public function facultyLoads(): HasMany
    {
        return $this->hasMany(FacultyLoad::class);
    }
}
