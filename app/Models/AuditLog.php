<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    /**
     * @var string
     */
    public const CREATED_AT = 'created_at';

    /**
     * @var null
     */
    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'faculty_load_id',
        'actor_user_id',
        'action',
        'old_status',
        'new_status',
        'notes',
        'created_at',
    ];

    /**
     * @return BelongsTo<FacultyLoad, $this>
     */
    public function facultyLoad(): BelongsTo
    {
        return $this->belongsTo(FacultyLoad::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
