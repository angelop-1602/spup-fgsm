import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { PaginatedResponse } from '@/types';

export type TermIndexTerm = {
    id: number;
    period_code: string;
    term_name: string;
    academic_year: string;
    is_active: boolean;
    total_loads: number;
    completed_loads: number;
};

export type TermIndexGroup = {
    academic_year: string;
    terms: TermIndexTerm[];
};

type TermIndexTableProps = {
    terms: TermIndexTerm[];
    renderStatusCell: (term: TermIndexTerm) => ReactNode;
    renderCompletionCell: (term: TermIndexTerm) => ReactNode;
    renderActionsCell: (term: TermIndexTerm) => ReactNode;
    emptyMessage: string;
};

export function TermIndexTable({
    terms,
    renderStatusCell,
    renderCompletionCell,
    renderActionsCell,
    emptyMessage,
}: TermIndexTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {terms.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                        >
                            {emptyMessage}
                        </TableCell>
                    </TableRow>
                ) : (
                    terms.map((term) => (
                        <TableRow key={term.id}>
                            <TableCell className="text-left">
                                {term.period_code}
                            </TableCell>
                            <TableCell>{term.term_name}</TableCell>
                            <TableCell>{term.academic_year}</TableCell>
                            <TableCell>{renderStatusCell(term)}</TableCell>
                            <TableCell>{renderCompletionCell(term)}</TableCell>
                            <TableCell>{renderActionsCell(term)}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

type TermIndexPaginationProps = {
    pagination: PaginatedResponse<unknown> | null;
};

export function TermIndexPagination({
    pagination,
}: TermIndexPaginationProps) {
    if (!pagination || pagination.links.length <= 3) {
        return null;
    }

    return (
        <div className="mt-4 flex justify-center gap-2">
            {pagination.links.map((link, index) => (
                <Link
                    key={index}
                    href={link.url || '#'}
                    className={cn(
                        'rounded border px-3 py-1',
                        link.active
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent',
                        !link.url && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <span
                        dangerouslySetInnerHTML={{
                            __html: link.label,
                        }}
                    />
                </Link>
            ))}
        </div>
    );
}
