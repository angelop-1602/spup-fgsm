import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type InlineActionsProps = {
    children: ReactNode;
    className?: string;
};

type InlineActionButtonProps = React.ComponentProps<typeof Button> & {
    icon?: ComponentType<{ className?: string }>;
    label: string;
};

export function InlineActions({ children, className }: InlineActionsProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {children}
        </div>
    );
}

export function InlineActionButton({
    icon: Icon,
    label,
    className,
    type = 'button',
    variant = 'outline',
    size = 'sm',
    ...props
}: InlineActionButtonProps) {
    return (
        <Button
            type={type}
            variant={variant}
            size={size}
            className={cn('h-8 gap-1.5 px-2.5 text-xs', className)}
            {...props}
        >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {label}
        </Button>
    );
}
