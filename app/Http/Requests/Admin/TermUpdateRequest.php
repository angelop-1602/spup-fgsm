<?php

namespace App\Http\Requests\Admin;

use App\Models\Term;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TermUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $term = $this->route('term');

        return $this->user()->can('update', $term);
    }

    public function rules(): array
    {
        /** @var Term $term */
        $term = $this->route('term');

        return [
            'academic_year' => ['required', 'string', 'max:255'],
            'term_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('terms')
                    ->where(function ($query) {
                        return $query->where('academic_year', $this->input('academic_year'));
                    })
                    ->ignore($term->id),
            ],
        ];
    }
}
