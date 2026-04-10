<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'description',
        'units',
    ];

    /**
     * @return HasMany<FacultyLoadItem, $this>
     */
    public function facultyLoadItems(): HasMany
    {
        return $this->hasMany(FacultyLoadItem::class);
    }
}
