<?php

namespace App\Http\Requests\Admin;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $department = $this->route('department');

        return $this->user()->can('update', $department);
    }

    public function rules(): array
    {
        /** @var Department $department */
        $department = $this->route('department');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('departments', 'name')->ignore($department->id)],
            'code' => ['nullable', 'string', 'max:255', Rule::unique('departments', 'code')->ignore($department->id)],
        ];
    }
}
