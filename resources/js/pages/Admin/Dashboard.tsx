import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import DashboardKpiCards from '@/components/dashboard/DashboardKpiCards';
import DepartmentCompletionChart from '@/components/dashboard/DepartmentCompletionChart';
import DepartmentEmploymentChart from '@/components/dashboard/DepartmentEmploymentChart';
import OverallEmploymentDonut from '@/components/dashboard/OverallEmploymentDonut';
import TermCommandSelect from '@/components/dashboard/TermCommandSelect';
import type {
    DashboardAnalyticsPayload,
    DashboardTermOption,
} from '@/components/dashboard/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Props = DashboardAnalyticsPayload;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
];

function termLabel(term: DashboardTermOption): string {
    if (term.period_code && term.period_code.trim() !== '') {
        return `${term.period_code} (${term.academic_year} - ${term.term_name})`;
    }

    return `${term.academic_year} - ${term.term_name}`;
}

export default function AdminDashboard({
    terms,
    selectedTermId,
    summary,
    departmentCompletion,
    departmentEmployment,
    overallEmployment,
}: Props) {
    const [termId, setTermId] = useState<string | undefined>(
        selectedTermId !== null ? String(selectedTermId) : undefined,
    );

    useEffect(() => {
        setTermId(selectedTermId !== null ? String(selectedTermId) : undefined);
    }, [selectedTermId]);

    const selectedTerm = useMemo(
        () => terms.find((term) => term.id === selectedTermId) ?? null,
        [terms, selectedTermId],
    );

    const handleTermChange = (value: string) => {
        setTermId(value || undefined);

        router.get(
            adminRoutes.dashboard().url,
            { term_id: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>Admin Analytics</CardTitle>
                                <CardDescription>
                                    Department completion and employment
                                    analytics by term.
                                </CardDescription>
                            </div>
                            <div className="w-full max-w-xs">
                                <p className="mb-2 text-xs text-muted-foreground">
                                    Selected term
                                </p>
                                <TermCommandSelect
                                    terms={terms}
                                    value={termId}
                                    onValueChange={handleTermChange}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        {selectedTerm ? (
                            <p>
                                Viewing analytics for{' '}
                                <span className="font-medium text-foreground">
                                    {termLabel(selectedTerm)}
                                </span>
                                .
                            </p>
                        ) : (
                            <p>
                                No term is selected. Add or activate a term to
                                enable load completion analytics.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <DashboardKpiCards summary={summary} />

                {terms.length === 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>No Terms Yet</CardTitle>
                            <CardDescription>
                                Load completion analytics are term-based. Create
                                terms to start tracking completion.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {terms.length > 0 && summary.totalLoads === 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                No Load Data For Selected Term
                            </CardTitle>
                            <CardDescription>
                                Departments are still shown so you can confirm
                                zero completion activity.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <DepartmentCompletionChart data={departmentCompletion} />
                <DepartmentEmploymentChart data={departmentEmployment} />
                <OverallEmploymentDonut data={overallEmployment} />
            </div>
        </AdminLayout>
    );
}
