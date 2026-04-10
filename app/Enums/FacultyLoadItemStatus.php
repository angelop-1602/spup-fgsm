<?php

namespace App\Enums;

enum FacultyLoadItemStatus: string
{
    case PENDING = 'PENDING';
    case RETURNED = 'RETURNED';
    case SUBMITTED = 'SUBMITTED';
}
