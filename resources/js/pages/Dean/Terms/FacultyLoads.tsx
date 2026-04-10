import { Head, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    MoreVertical,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import DeanLayout from '@/layouts/DeanLayout';
import deanRoutes from '@/routes/dean';
import type { BreadcrumbItem, PaginatedResponse } from '@/types';

type Term = {
    id: number;
    period_code: string;
    term_name: string;
    academic_year: string;
    is_active: boolean;
    is_completed: boolean;
    admin_override_unlocked: boolean;
};

type Department = {
    id: number;
    name: string;
    code: string | null;
};

type FacultyLoad = {
    id: number;
    status: 'PENDING' | 'FOR_REVISION' | 'SUBMITTED' | 'CLEARED';
    items_count: number;
    submitted_items_count: number;
    returned_items_count: number;
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
    isLocked: boolean;
    autoLockEnabled: boolean;
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

function submissionProgressBadge(load: FacultyLoad) {
    const total = load.items_count;
    const submitted = load.submitted_items_count;
    const returned = load.returned_items_count;

    if (total > 0 && submitted >= total) {
        return (
            <Badge className="bg-emerald-500 text-emerald-50">
                Completed {submitted}/{total}
            </Badge>
        );
    }

    if (returned > 0) {
        return (
            <Badge variant="outline" className="border-amber-500 text-amber-700">
                Submitted {submitted}/{total}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-slate-400 text-slate-700">
            Submitted {submitted}/{total}
        </Badge>
    );
}

export default function TermFacultyLoadsPage({
    term,
    loads,
    filters,
    isLocked,
    autoLockEnabled,
}: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [rowsPerPage, setRowsPerPage] = useState(
        String(filters.per_page ?? loads.per_page ?? 10),
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dean Dashboard', href: deanRoutes.dashboard().url },
        { title: 'Terms', href: deanRoutes.terms.index().url },
        {
            title: `${term.period_code} Faculty Loads`,
            href: deanRoutes.terms.facultyLoads.show({ term: term.id }).url,
        },
    ];

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                deanRoutes.terms.facultyLoads.show({ term: term.id }).url,
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
            deanRoutes.terms.facultyLoads.show({ term: term.id }).url,
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

    const paginationItems = useMemo(
        () => buildPageItems(loads.current_page, loads.last_page),
        [loads.current_page, loads.last_page],
    );

    const showingFrom = loads.total === 0 ? 0 : (loads.current_page - 1) * loads.per_page + 1;
    const showingTo = Math.min(loads.current_page * loads.per_page, loads.total);

    return (
        <DeanLayout breadcrumbs={breadcrumbs}>
            <Head title="Faculty Loads" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>
                                {term.term_name} - {term.academic_year}
                            </CardTitle>
                            <CardDescription>
                                {term.period_code} faculty loads in your department
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {isLocked ? (
                                <Badge variant="destructive">Locked</Badge>
                            ) : term.is_completed ? (
                                autoLockEnabled ? (
                                    <Badge className="bg-emerald-500 text-emerald-50">
                                        Unlocked
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="border-blue-500 text-blue-600"
                                    >
                                        Completed
                                    </Badge>
                                )
                            ) : (
                                <Badge
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-700"
                                >
                                    Open
                                </Badge>
                            )}
                            {!term.is_active && (
                                <Badge
                                    variant="outline"
                                    className="border-red-500 text-red-600"
                                >
                                    Inactive Term
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLocked && (
                            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                This term is currently locked. Loads can be viewed but cannot be changed.
                            </div>
                        )}

                        <div className="mb-4 max-w-sm">
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

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Faculty Code</TableHead>
                                    <TableHead>Faculty Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Rows</TableHead>
                                    <TableHead>Progress</TableHead>
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
                                            No faculty loads found for this term.
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
                                                {submissionProgressBadge(load)}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(
                                                    load.updated_at,
                                                ).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Load actions"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.visit(
                                                                    deanRoutes.terms.facultyLoads.view(
                                                                        {
                                                                            term: term.id,
                                                                            facultyLoad:
                                                                                load.id,
                                                                        },
                                                                    ).url,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
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
                                            <SelectItem
                                                key={option}
                                                value={option}
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Showing {showingFrom} to {showingTo} of{' '}
                                {loads.total} load(s)
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
                                    onClick={() =>
                                        goToPage(loads.current_page - 1)
                                    }
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
                                    onClick={() =>
                                        goToPage(loads.current_page + 1)
                                    }
                                    disabled={
                                        loads.current_page >= loads.last_page
                                    }
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(loads.last_page)}
                                    disabled={
                                        loads.current_page >= loads.last_page
                                    }
                                    aria-label="Last page"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DeanLayout>
    );
}
