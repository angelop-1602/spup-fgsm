<?php

namespace App\Http\Requests\Admin;

use App\Models\Faculty;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FacultyStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Faculty::class) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'faculty_code' => ['required', 'string', 'max:255', 'unique:faculty,faculty_code'],
            'full_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'call_name' => ['nullable', 'string', 'max:255'],
            'contact_no' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'max:255'],
            'emp_type' => ['nullable', 'string', 'max:255'],
            'emp_status' => ['nullable', 'string', 'max:255'],
            'supervisor' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['ACTIVE', 'INACTIVE'])],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ];
    }
}
