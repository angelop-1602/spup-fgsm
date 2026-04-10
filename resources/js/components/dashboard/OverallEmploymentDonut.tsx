import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import type { OverallEmploymentDatum } from '@/components/dashboard/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

type Props = {
    data: OverallEmploymentDatum[];
};

type TooltipPayload = {
    color?: string;
    value?: number | string;
    payload?: {
        label: string;
        value: number;
    };
};

type TooltipContentProps = {
    active?: boolean;
    payload?: TooltipPayload[];
    total: number;
};

const chartConfig: ChartConfig = {
    partTime: {
        label: 'Part-time',
        color: 'var(--color-chart-2)',
    },
    fullTime: {
        label: 'Full-time',
        color: 'var(--color-chart-3)',
    },
};

function OverallEmploymentTooltip({
    active,
    payload,
    total,
}: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const entry = payload[0]?.payload;
    if (!entry) {
        return null;
    }

    const value = Number(payload[0]?.value ?? 0);
    const percent = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="min-w-40 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
            <p className="font-medium text-foreground">{entry.label}</p>
            <p className="mt-1 text-muted-foreground">
                {value} faculty ({percent.toFixed(1)}%)
            </p>
        </div>
    );
}

export default function OverallEmploymentDonut({ data }: Props) {
    const chartData = data.map((item) => {
        const key = item.label.toLowerCase().includes('part')
            ? 'partTime'
            : 'fullTime';

        return {
            ...item,
            key,
            fill: `var(--color-${key})`,
        };
    });

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Overall Employment Split</CardTitle>
                <CardDescription>
                    Donut view of part-time and full-time active faculty.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <ChartContainer config={chartConfig} className="h-[280px]">
                    <PieChart>
                        <Tooltip
                            content={<OverallEmploymentTooltip total={total} />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={64}
                            outerRadius={104}
                            paddingAngle={3}
                            strokeWidth={0}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.label} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                </ChartContainer>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Total active faculty:{' '}
                        <span className="font-medium text-foreground">
                            {total}
                        </span>
                    </p>
                    <div className="space-y-2">
                        {chartData.map((entry) => {
                            const percent =
                                total > 0 ? (entry.value / total) * 100 : 0;

                            return (
                                <div
                                    key={entry.label}
                                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="size-2.5 rounded-[3px]"
                                            style={{
                                                backgroundColor: entry.fill,
                                            }}
                                        />
                                        <span className="text-sm">
                                            {entry.label}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {entry.value} ({percent.toFixed(1)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
