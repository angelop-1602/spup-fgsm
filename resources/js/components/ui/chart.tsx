import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

const THEMES = {
    light: '',
    dark: '.dark',
} as const;

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        color?: string;
        theme?: Record<keyof typeof THEMES, string>;
    }
>;

type ChartContextValue = {
    config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error('useChart must be used inside a ChartContainer.');
    }

    return context;
}

type ChartContainerProps = React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ReactNode;
};

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
    ({ id, className, children, config, ...props }, ref) => {
        const uniqueId = React.useId();
        const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

        return (
            <ChartContext.Provider value={{ config }}>
                <div
                    ref={ref}
                    data-chart={chartId}
                    className={cn(
                        'h-[320px] w-full text-xs [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/60 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-tooltip-cursor]:fill-muted/40',
                        className,
                    )}
                    {...props}
                >
                    <ChartStyle id={chartId} config={config} />
                    <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
                </div>
            </ChartContext.Provider>
        );
    },
);

ChartContainer.displayName = 'ChartContainer';

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
    const colorEntries = Object.entries(config).filter(([, value]) => value.color || value.theme);
    if (colorEntries.length === 0) {
        return null;
    }

    const css = Object.entries(THEMES)
        .map(([theme, selector]) => {
            const declarations = colorEntries
                .map(([key, value]) => {
                    const resolvedColor = value.theme?.[theme as keyof typeof THEMES] ?? value.color;
                    if (!resolvedColor) {
                        return null;
                    }

                    return `  --color-${key}: ${resolvedColor};`;
                })
                .filter((line): line is string => line !== null)
                .join('\n');

            if (declarations === '') {
                return null;
            }

            return `${selector} [data-chart="${id}"] {\n${declarations}\n}`;
        })
        .filter((block): block is string => block !== null)
        .join('\n');

    if (css === '') {
        return null;
    }

    return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipRow = {
    color?: string;
    name?: string;
    value?: string | number;
    dataKey?: string | number;
};

type ChartTooltipContentProps = {
    active?: boolean;
    payload?: TooltipRow[];
    label?: string | number;
    className?: string;
};

function ChartTooltipContent({ active, payload, label, className }: ChartTooltipContentProps) {
    const { config } = useChart();

    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className={cn('min-w-40 rounded-lg border bg-background p-2.5 text-xs shadow-md', className)}>
            {label !== undefined && label !== null && (
                <p className="mb-1.5 font-medium text-foreground">{String(label)}</p>
            )}
            <div className="space-y-1">
                {payload.map((item, index) => {
                    const key = String(item.dataKey ?? item.name ?? index);
                    const entry = config[key];
                    const itemLabel = entry?.label ?? item.name ?? key;

                    return (
                        <div
                            key={`${key}-${index}`}
                            className="flex items-center justify-between gap-3 text-muted-foreground"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="size-2 rounded-[2px]"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span>{itemLabel}</span>
                            </div>
                            <span className="font-medium text-foreground">{item.value ?? 0}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, useChart };
