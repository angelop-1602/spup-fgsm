import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    FileText,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
import {
    TermCompletionBadge,
    TermStatusBadge,
} from '@/components/term-state';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    is_active: boolean;
    total_loads: number;
    completed_loads: number;
};

type Department = {
    id: number;
    name: string;
    code: string | null;
};

type FacultyLoad = {
    id: number;
    status: 'SUBMITTED' | 'CLEARED' | string;
    items_count: number;
    updated_at: string;
    faculty: {
        id: number;
        faculty_code: string;
        full_name: string;
    } | null;
    department: Department | null;
};

type Props = {
    term: Term;
    loads: PaginatedResponse<FacultyLoad>;
    filters: {
        q?: string;
        per_page?: number;
    };
};

const perPageOptions = ['10', '25', '50'];

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

function statusBadge(status: FacultyLoad['status']) {
    if (status === 'CLEARED') {
        return <Badge className="bg-emerald-500 text-emerald-50">Cleared</Badge>;
    }

    return (
        <Badge variant="outline" className="border-amber-500 text-amber-700">
            Submitted
        </Badge>
    );
}

export default function ClearanceShowPage({ term, loads, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [rowsPerPage, setRowsPerPage] = useState(
        String(filters.per_page ?? loads.per_page ?? 10),
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Dashboard', href: adminRoutes.dashboard().url },
        { title: 'Clearance', href: adminRoutes.clearance.index().url },
        {
            title: `${term.period_code} Faculty Loads`,
            href: adminRoutes.clearance.show({ term: term.id }).url,
        },
    ];

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                adminRoutes.clearance.show({ term: term.id }).url,
                {
                    q: search || undefined,
                    per_page: Number(rowsPerPage),
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
    }, [rowsPerPage, search, term.id]);

    const goToPage = (page: number) => {
        if (page < 1 || page > loads.last_page || page === loads.current_page) {
            return;
        }

        router.get(
            adminRoutes.clearance.show({ term: term.id }).url,
            {
                q: search || undefined,
                per_page: Number(rowsPerPage),
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const markAsCleared = (loadId: number) => {
        router.patch(
            adminRoutes.clearance.clear({ term: term.id, facultyLoad: loadId })
                .url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Faculty load marked as cleared.');
                },
                onError: (errors) => {
                    toast.error(
                        errors.status ?? 'Unable to mark faculty load as cleared.',
                    );
                },
            },
        );
    };

    const exportPdf = () => {
        const params = new URLSearchParams();
        params.set('format', 'pdf');
        if (search) {
            params.set('q', search);
        }

        const exportUrl = `/admin/clearance/${term.id}/export?${params.toString()}`;
        window.open(exportUrl, '_blank', 'noopener,noreferrer');
    };

    const paginationItems = useMemo(
        () => buildPageItems(loads.current_page, loads.last_page),
        [loads.current_page, loads.last_page],
    );

    const submittedCount = loads.data.filter(
        (load) => load.status === 'SUBMITTED',
    ).length;
    const clearedCount = loads.data.filter(
        (load) => load.status === 'CLEARED',
    ).length;
    const showingFrom =
        loads.total === 0 ? 0 : (loads.current_page - 1) * loads.per_page + 1;
    const showingTo = Math.min(loads.current_page * loads.per_page, loads.total);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Clearance Faculty Loads" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>
                                {term.term_name} - {term.academic_year}
                            </CardTitle>
                            <CardDescription>
                                {term.period_code} completed faculty submissions
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <TermStatusBadge isActive={term.is_active} />
                            <TermCompletionBadge
                                completed={term.completed_loads}
                                total={term.total_loads}
                            />
                            <Badge
                                variant="outline"
                                className="border-slate-400 text-slate-700"
                            >
                                Clearance (Page): Pending {submittedCount} / Cleared{' '}
                                {clearedCount}
                            </Badge>
                            <Button variant="outline" onClick={exportPdf}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!term.is_active && (
                            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                This term is inactive. Activate it before clearing faculty loads.
                            </div>
                        )}

                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="w-full max-w-sm">
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                        <Search className="h-4 w-4" />
                                    </span>
                                    <Input
                                        type="text"
                                        placeholder="Search faculty or department..."
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Rows per page
                                </span>
                                <Select
                                    value={rowsPerPage}
                                    onValueChange={setRowsPerPage}
                                >
                                    <SelectTrigger className="h-9 w-[90px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perPageOptions.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Faculty Code</TableHead>
                                    <TableHead>Faculty Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Subjects</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loads.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center text-muted-foreground"
                                        >
                                            No completed faculty loads found for this term.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    loads.data.map((load) => (
                                        <TableRow key={load.id}>
                                            <TableCell className="font-mono">
                                                {load.faculty?.faculty_code || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {load.faculty?.full_name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {load.department?.code ||
                                                    load.department?.name ||
                                                    '-'}
                                            </TableCell>
                                            <TableCell>{load.items_count}</TableCell>
                                            <TableCell>
                                                {statusBadge(load.status)}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(
                                                    load.updated_at,
                                                ).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <InlineActions>
                                                    <InlineActionButton
                                                        icon={Eye}
                                                        label="View"
                                                        onClick={() =>
                                                            router.visit(
                                                                adminRoutes.terms.facultyLoads.view(
                                                                    {
                                                                        term: term.id,
                                                                        facultyLoad:
                                                                            load.id,
                                                                    },
                                                                ).url,
                                                            )
                                                        }
                                                    />
                                                    <InlineActionButton
                                                        icon={CheckCircle2}
                                                        label="Clear"
                                                        disabled={
                                                            !term.is_active ||
                                                            load.status !==
                                                                'SUBMITTED'
                                                        }
                                                        onClick={() =>
                                                            markAsCleared(
                                                                load.id,
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
                                Showing {showingFrom} to {showingTo} of {loads.total}{' '}
                                faculty load(s)
                            </p>

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(1)}
                                    disabled={loads.current_page <= 1}
                                    aria-label="First page"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(loads.current_page - 1)}
                                    disabled={loads.current_page <= 1}
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
                                                item === loads.current_page
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
                                    onClick={() => goToPage(loads.current_page + 1)}
                                    disabled={loads.current_page >= loads.last_page}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(loads.last_page)}
                                    disabled={loads.current_page >= loads.last_page}
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
