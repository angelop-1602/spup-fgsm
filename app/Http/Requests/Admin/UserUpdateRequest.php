<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User $model */
        $model = $this->route('user');

        return $model !== null && $this->user()?->can('update', $model) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $model */
        $model = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($model->id),
            ],
            'role' => ['required', Rule::in(['ADMIN', 'REGISTRAR_STAFF', 'DEAN'])],
            'department_id' => [
                'nullable',
                'integer',
                'exists:departments,id',
                'required_if:role,DEAN',
            ],
        ];
    }
}
