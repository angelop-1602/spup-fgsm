import type { DashboardSummary } from '@/components/dashboard/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
    summary: DashboardSummary;
};

type KpiCard = {
    title: string;
    value: string | number;
    detail: string;
};

export default function DashboardKpiCards({ summary }: Props) {
    const cards: KpiCard[] = [
        {
            title: 'Terms Managed',
            value: summary.termsCount,
            detail: 'Total terms available in the system.',
        },
        {
            title: 'Total Loads',
            value: summary.totalLoads,
            detail: 'Loads tracked for the selected term.',
        },
        {
            title: 'Completed Loads',
            value: summary.completedLoads,
            detail: 'Statuses SUBMITTED and CLEARED.',
        },
        {
            title: 'Not Completed Loads',
            value: summary.notCompletedLoads,
            detail: 'Statuses PENDING and FOR_REVISION.',
        },
        {
            title: 'Completion Rate',
            value: `${summary.overallCompletionRate.toFixed(2)}%`,
            detail: 'Completed loads divided by total loads.',
        },
        {
            title: 'Active Faculty',
            value: summary.activeFacultyCount,
            detail: `Part-time ${summary.partTimeCount} | Full-time ${summary.fullTimeCount}`,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {card.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="text-3xl font-semibold tracking-tight">
                            {card.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {card.detail}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
