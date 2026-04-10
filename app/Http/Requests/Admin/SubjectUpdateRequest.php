<?php

namespace App\Http\Requests\Admin;

use App\Models\Subject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubjectUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Subject $subject */
        $subject = $this->route('subject');

        return $subject !== null && $this->user()?->can('update', $subject) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Subject $subject */
        $subject = $this->route('subject');

        return [
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('subjects', 'code')->ignore($subject->id),
            ],
            'description' => ['required', 'string', 'max:255'],
            'units' => ['nullable', 'numeric'],
        ];
    }
}
