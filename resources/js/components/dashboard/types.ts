export type DashboardTermOption = {
    id: number;
    period_code: string | null;
    academic_year: string;
    term_name: string;
    is_active: boolean;
};

export type DashboardSummary = {
    termsCount: number;
    completedLoads: number;
    notCompletedLoads: number;
    totalLoads: number;
    overallCompletionRate: number;
    activeFacultyCount: number;
    partTimeCount: number;
    fullTimeCount: number;
};

export type DepartmentCompletionDatum = {
    departmentId: number;
    departmentLabel: string;
    completedCount: number;
    notCompletedCount: number;
    totalLoads: number;
};

export type DepartmentEmploymentDatum = {
    departmentId: number;
    departmentLabel: string;
    partTimeCount: number;
    fullTimeCount: number;
    activeFacultyCount: number;
};

export type OverallEmploymentDatum = {
    label: string;
    value: number;
};

export type DashboardAnalyticsPayload = {
    terms: DashboardTermOption[];
    selectedTermId: number | null;
    summary: DashboardSummary;
    departmentCompletion: DepartmentCompletionDatum[];
    departmentEmployment: DepartmentEmploymentDatum[];
    overallEmployment: OverallEmploymentDatum[];
};
