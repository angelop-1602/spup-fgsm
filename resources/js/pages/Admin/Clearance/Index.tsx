import { Head, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem, PaginatedResponse } from '@/types';

type Term = {
    id: number;
    period_code: string;
    term_name: string;
    academic_year: string;
    total_loads: number;
    completed_loads: number;
    submitted_loads: number;
    cleared_loads: number;
};

type Props = {
    terms: PaginatedResponse<Term>;
    filters: {
        q?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: adminRoutes.dashboard().url },
    { title: 'Clearance', href: adminRoutes.clearance.index().url },
];

function buildPageItems(
    currentPage: number,
    lastPage: number,
): Array<number | 'ellipsis'> {
    if (lastPage <= 1) {
        return [1];
    }

    const pages = new Set<number>([
        1,
        lastPage,
        currentPage - 1,
        currentPage,
        currentPage + 1,
    ]);

    const filtered = Array.from(pages)
        .filter((page) => page >= 1 && page <= lastPage)
        .sort((a, b) => a - b);

    const items: Array<number | 'ellipsis'> = [];

    for (let i = 0; i < filtered.length; i += 1) {
        const page = filtered[i];
        const previous = filtered[i - 1];

        if (previous !== undefined && page - previous > 1) {
            items.push('ellipsis');
        }

        items.push(page);
    }

    return items;
}

export default function ClearanceIndexPage({ terms, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                adminRoutes.clearance.index().url,
                {
                    q: search || undefined,
                    page: 1,
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const goToPage = (page: number) => {
        if (page < 1 || page > terms.last_page || page === terms.current_page) {
            return;
        }

        router.get(
            adminRoutes.clearance.index().url,
            {
                q: search || undefined,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const paginationItems = useMemo(
        () => buildPageItems(terms.current_page, terms.last_page),
        [terms.current_page, terms.last_page],
    );

    const showingFrom =
        terms.total === 0 ? 0 : (terms.current_page - 1) * terms.per_page + 1;
    const showingTo = Math.min(terms.current_page * terms.per_page, terms.total);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Clearance" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Clearance Terms</CardTitle>
                        <CardDescription>
                            Track submitted grading sheets and mark faculty loads as cleared.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 max-w-sm">
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                </span>
                                <Input
                                    type="text"
                                    placeholder="Search by term, code, or AY..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Academic Year</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Clearance</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terms.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground"
                                        >
                                            No terms found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    terms.data.map((term) => (
                                        <TableRow key={term.id}>
                                            <TableCell className="font-medium">
                                                {term.period_code}
                                            </TableCell>
                                            <TableCell>{term.term_name}</TableCell>
                                            <TableCell>{term.academic_year}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-slate-400 text-slate-700"
                                                >
                                                    {term.completed_loads}/
                                                    {term.total_loads}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-slate-400 text-slate-700"
                                                >
                                                    Pending {term.submitted_loads} / Cleared{' '}
                                                    {term.cleared_loads}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <InlineActions>
                                                    <InlineActionButton
                                                        icon={Eye}
                                                        label="View"
                                                        onClick={() =>
                                                            router.visit(
                                                                adminRoutes.clearance.show(
                                                                    {
                                                                        term: term.id,
                                                                    },
                                                                ).url,
                                                            )
                                                        }
                                                    />
                                                </InlineActions>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {showingFrom} to {showingTo} of {terms.total} term(s)
                            </p>

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(1)}
                                    disabled={terms.current_page <= 1}
                                    aria-label="First page"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(terms.current_page - 1)}
                                    disabled={terms.current_page <= 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {paginationItems.map((item, index) =>
                                    item === 'ellipsis' ? (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className="px-2 text-sm text-muted-foreground"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={item}
                                            type="button"
                                            variant={
                                                item === terms.current_page
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            size="sm"
                                            className="h-9 min-w-9 px-2"
                                            onClick={() => goToPage(item)}
                                        >
                                            {item}
                                        </Button>
                                    ),
                                )}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(terms.current_page + 1)}
                                    disabled={terms.current_page >= terms.last_page}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(terms.last_page)}
                                    disabled={terms.current_page >= terms.last_page}
                                    aria-label="Last page"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
