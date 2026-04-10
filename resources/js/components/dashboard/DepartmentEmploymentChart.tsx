import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { DepartmentEmploymentDatum } from '@/components/dashboard/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

type Props = {
    data: DepartmentEmploymentDatum[];
};

type TooltipPayload = {
    color?: string;
    value?: number | string;
    dataKey?: string | number;
    payload?: DepartmentEmploymentDatum;
};

type TooltipContentProps = {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string | number;
};

const chartConfig: ChartConfig = {
    partTimeCount: {
        label: 'Part-time',
        color: 'var(--color-chart-2)',
    },
    fullTimeCount: {
        label: 'Full-time',
        color: 'var(--color-chart-3)',
    },
};

function EmploymentTooltipContent({
    active,
    payload,
    label,
}: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const activeFacultyCount = payload[0]?.payload?.activeFacultyCount ?? 0;

    return (
        <div className="min-w-48 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
            <p className="mb-2 font-medium text-foreground">{String(label)}</p>
            <div className="space-y-1.5">
                {payload.map((item, index) => {
                    const value = Number(item.value ?? 0);
                    const percent =
                        activeFacultyCount > 0
                            ? (value / activeFacultyCount) * 100
                            : 0;
                    const seriesLabel =
                        item.dataKey === 'partTimeCount'
                            ? 'Part-time'
                            : 'Full-time';

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
                    Faculty in selected term:{' '}
                    <span className="font-medium text-foreground">
                        {activeFacultyCount}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function DepartmentEmploymentChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Department Employment Mix</CardTitle>
                    <CardDescription>
                        Part-time versus full-time faculty with loads in the
                        selected term.
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
                <CardTitle>Department Employment Mix</CardTitle>
                <CardDescription>
                    Grouped comparison of part-time and full-time faculty
                    counted from the selected term's loads.
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
                            <BarChart
                                data={data}
                                margin={{
                                    top: 20,
                                    right: 24,
                                    left: 4,
                                    bottom: 88,
                                }}
                                barGap={12}
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
                                    content={<EmploymentTooltipContent />}
                                />
                                <Legend />
                                <Bar
                                    dataKey="partTimeCount"
                                    fill="var(--color-partTimeCount)"
                                    name="Part-time"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="fullTimeCount"
                                    fill="var(--color-fullTimeCount)"
                                    name="Full-time"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
