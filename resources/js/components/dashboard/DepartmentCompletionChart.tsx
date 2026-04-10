import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { DepartmentCompletionDatum } from '@/components/dashboard/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

type Props = {
    data: DepartmentCompletionDatum[];
};

type TooltipPayload = {
    color?: string;
    value?: number | string;
    dataKey?: string | number;
    payload?: DepartmentCompletionDatum;
};

type TooltipContentProps = {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string | number;
};

const chartConfig: ChartConfig = {
    completedCount: {
        label: 'Completed',
        color: 'var(--color-chart-1)',
    },
    notCompletedCount: {
        label: 'Not Completed',
        color: 'var(--color-chart-4)',
    },
};

function CompletionTooltipContent({
    active,
    payload,
    label,
}: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const totalLoads = payload[0]?.payload?.totalLoads ?? 0;

    return (
        <div className="min-w-48 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
            <p className="mb-2 font-medium text-foreground">{String(label)}</p>
            <div className="space-y-1.5">
                {payload.map((item, index) => {
                    const value = Number(item.value ?? 0);
                    const percent =
                        totalLoads > 0 ? (value / totalLoads) * 100 : 0;
                    const seriesLabel =
                        item.dataKey === 'completedCount'
                            ? 'Completed'
                            : 'Not Completed';

                    return (
                        <div
                            key={`${String(item.dataKey ?? index)}-${index}`}
                            className="flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="size-2 rounded-[2px]"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-muted-foreground">
                                    {seriesLabel}
                                </span>
                            </div>
                            <span className="font-medium text-foreground">
                                {value} ({percent.toFixed(1)}%)
                            </span>
                        </div>
                    );
                })}
                <div className="border-t pt-1.5 text-muted-foreground">
                    Department total:{' '}
                    <span className="font-medium text-foreground">
                        {totalLoads}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function DepartmentCompletionChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Department Completion Status</CardTitle>
                    <CardDescription>
                        Completed versus not completed load counts per
                        department.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No departments found.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Department Completion Status</CardTitle>
                <CardDescription>
                    Line comparison of completed and not completed faculty loads
                    by department.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div
                        style={{
                            minWidth: `${Math.max(data.length * 92, 760)}px`,
                        }}
                    >
                        <ChartContainer
                            config={chartConfig}
                            className="h-[360px]"
                        >
                            <LineChart
                                data={data}
                                margin={{
                                    top: 20,
                                    right: 24,
                                    left: 4,
                                    bottom: 88,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="departmentLabel"
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={80}
                                    tickMargin={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    content={<CompletionTooltipContent />}
                                />
                                <Legend />
                                <Line
                                    dataKey="notCompletedCount"
                                    stroke="var(--color-notCompletedCount)"
                                    name="Not Completed"
                                    strokeWidth={3}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    type="monotone"
                                />
                                <Line
                                    dataKey="completedCount"
                                    stroke="var(--color-completedCount)"
                                    name="Completed"
                                    strokeWidth={3}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    type="monotone"
                                />
                            </LineChart>
                        </ChartContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
