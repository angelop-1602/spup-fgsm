import { Badge } from '@/components/ui/badge';

type TermStatusBadgeProps = {
    isActive: boolean;
};

type TermCompletionBadgeProps = {
    completed: number;
    total: number;
};

export function TermStatusBadge({ isActive }: TermStatusBadgeProps) {
    if (isActive) {
        return (
            <Badge
                variant="outline"
                className="border-emerald-500 text-emerald-700"
            >
                Active
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-red-500 text-red-600">
            Inactive
        </Badge>
    );
}

export function TermCompletionBadge({
    completed,
    total,
}: TermCompletionBadgeProps) {
    return (
        <Badge variant="outline" className="border-slate-400 text-slate-700">
            {completed}/{total}
        </Badge>
    );
}

export function termCompletionLabel(completed: number, total: number): string {
    return `${completed}/${total}`;
}
