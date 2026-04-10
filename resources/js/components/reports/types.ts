import type { PaginatedResponse } from '@/types';

export type ReportContext = 'term' | 'clearance' | 'faculty';

export type ReportTerm = {
    id: number;
    academic_year: string;
    term_name: string;
    period_code: string;
};

export type ReportDepartment = {
    id: number;
    name: string;
};

export type ReportFaculty = {
    id: number;
    faculty_code: string;
    full_name: string;
    middle_name?: string | null;
    emp_status?: string | null;
    department?: {
        id: number;
        name: string;
    } | null;
};

export type ReportLoadRow = {
    id: number;
    status: string;
    term: ReportTerm;
    faculty: ReportFaculty | null;
    department: ReportDepartment | null;
    // Term/Clearance contexts
    items_count?: number;
    total_units_sum?: number | null;

    // Faculty context (per-subject item rows)
    subject_code?: string | null;
    total_units?: number | null;
    section?: string | null;
};

export type ReportFilters = {
    term_id?: number;
    faculty_id?: number;
    department_id?: number;
    status?: string;
    emp_status?: string;
    context?: ReportContext;
};

export type ReportPageProps = {
    loads: PaginatedResponse<ReportLoadRow>;
    terms: ReportTerm[];
    departments: ReportDepartment[];
    faculties: ReportFaculty[];
    selectedFaculty: ReportFaculty | null;
    filters: ReportFilters;
};
