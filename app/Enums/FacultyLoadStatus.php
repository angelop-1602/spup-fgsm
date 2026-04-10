<?php

namespace App\Enums;

enum FacultyLoadStatus: string
{
    case PENDING = 'PENDING';
    case FOR_REVISION = 'FOR_REVISION';
    case SUBMITTED = 'SUBMITTED';
    case CLEARED = 'CLEARED';
}
