<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CommitGeneratedTermsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('ADMIN') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'terms' => ['required', 'array', 'min:1'],
            'terms.*.school_unit' => ['required', Rule::in(['COLLEGE', 'GRADUATE'])],
            'terms.*.year_start' => ['required', 'integer'],
            'terms.*.year_end' => ['required', 'integer', 'gte:terms.*.year_start'],
            'terms.*.academic_year' => ['required', 'string'],
            'terms.*.term_name' => ['required', 'string'],
            'terms.*.period_code' => ['required', 'string'],
            'terms.*.display_code' => ['nullable', 'string'],
            'terms.*.is_active' => ['required', 'boolean'],
        ];
    }
}
