import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    Download,
    Eye,
    FileSpreadsheet,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    TermIndexPagination,
    TermIndexTable,
    type TermIndexGroup,
    type TermIndexTerm,
} from '@/components/term-index-table';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
import {
    TermCompletionBadge,
    TermStatusBadge,
} from '@/components/term-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import StaffLayout from '@/layouts/StaffLayout';
import staffRoutes from '@/routes/staff';
import type { BreadcrumbItem, PaginatedResponse } from '@/types';

type ListingMode = 'grouped' | 'flat';

type ReportTerm = {
    id: number;
    academic_year: string;
    term_name: string;
    period_code: string;
};

type Department = {
    id: number;
    name: string;
};

type Props = {
    listing_mode: ListingMode;
    grouped_terms: PaginatedResponse<TermIndexGroup> | null;
    terms: PaginatedResponse<TermIndexTerm> | null;
    latest_academic_year: string | null;
    filters: {
        q?: string | null;
    };
    reportTerms: ReportTerm[];
    departments: Department[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Staff Dashboard',
        href: staffRoutes.dashboard().url,
    },
    {
        title: 'Terms',
        href: staffRoutes.terms.index().url,
    },
];

export default function StaffTermsIndex({
    listing_mode,
    grouped_terms,
    terms,
    latest_academic_year,
    filters,
    reportTerms,
    departments,
}: Props) {
    const currentSearch = filters.q ?? '';
    const [search, setSearch] = useState(currentSearch);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [openAcademicYears, setOpenAcademicYears] = useState<
        Record<string, boolean>
    >({});
    const [reportFilters, setReportFilters] = useState({
        term_id: '',
        academic_year: '',
        department_id: '',
        status: '',
        faculty_search: '',
    });

    const pagination = listing_mode === 'grouped' ? grouped_terms : terms;

    useEffect(() => {
        setSearch(currentSearch);
    }, [currentSearch]);

    useEffect(() => {
        if (listing_mode !== 'grouped' || !grouped_terms) {
            return;
        }

        setOpenAcademicYears((current) =>
            Object.fromEntries(
                grouped_terms.data.map((group) => [
                    group.academic_year,
                    current[group.academic_year] ??
                        (group.academic_year === latest_academic_year),
                ]),
            ),
        );
    }, [grouped_terms, latest_academic_year, listing_mode]);

    useEffect(() => {
        const trimmedSearch = search.trim();

        if (trimmedSearch === currentSearch) {
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                staffRoutes.terms.index().url,
                {
                    q: trimmedSearch || undefined,
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
    }, [currentSearch, search]);

    const academicYears = useMemo(
        () =>
            Array.from(new Set(reportTerms.map((term) => term.academic_year))).sort(
                (left, right) => right.localeCompare(left),
            ),
        [reportTerms],
    );

    const handleReportExport = (format: 'csv' | 'xlsx' | 'pdf') => {
        if (!reportFilters.academic_year && !reportFilters.term_id) {
            return;
        }

        const params: Record<string, string | number> = {
            format,
        };

        if (reportFilters.academic_year) {
            params.academic_year = reportFilters.academic_year;
        } else if (reportFilters.term_id) {
            params.term_id = Number(reportFilters.term_id);
        }

        if (reportFilters.department_id) {
            params.department_id = Number(reportFilters.department_id);
        }

        if (reportFilters.status) {
            params.status = reportFilters.status;
        }

        if (reportFilters.faculty_search) {
            params.faculty_search = reportFilters.faculty_search;
        }

        const queryString = new URLSearchParams(
            Object.entries(params).reduce(
                (accumulator, [key, value]) => {
                    accumulator[key] = String(value);
                    return accumulator;
                },
                {} as Record<string, string>,
            ),
        ).toString();

        window.location.href = `${staffRoutes.reports.export().url}?${queryString}`;
    };

    const renderTermsTable = (termRows: TermIndexTerm[]) => (
        <TermIndexTable
            terms={termRows}
            emptyMessage="No terms found."
            renderStatusCell={(term) => (
                <TermStatusBadge isActive={term.is_active} />
            )}
            renderCompletionCell={(term) => (
                <TermCompletionBadge
                    completed={term.completed_loads}
                    total={term.total_loads}
                />
            )}
            renderActionsCell={(term) => (
                <InlineActions>
                    <InlineActionButton
                        icon={Eye}
                        label="View"
                        onClick={() =>
                            router.visit(
                                `/staff/terms/${term.id}/faculty-loads`,
                            )
                        }
                    />
                </InlineActions>
            )}
        />
    );

    return (
        <StaffLayout breadcrumbs={breadcrumbs}>
            <Head title="Terms" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Terms</CardTitle>
                            <CardDescription>View academic terms</CardDescription>
                        </div>
                        <Dialog
                            open={reportDialogOpen}
                            onOpenChange={setReportDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Reports / Export
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogTitle>Reports / Exports</DialogTitle>
                                <DialogDescription>
                                    Choose filters and export faculty load submissions for a term
                                    or an entire academic year.
                                </DialogDescription>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="report_academic_year">Academic Year</Label>
                                        <Select
                                            value={reportFilters.academic_year}
                                            onValueChange={(value) =>
                                                setReportFilters((previous) => ({
                                                    ...previous,
                                                    academic_year: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_academic_year">
                                                <SelectValue placeholder="All years (use Term below)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears.map((academicYear) => (
                                                    <SelectItem
                                                        key={academicYear}
                                                        value={academicYear}
                                                    >
                                                        {academicYear}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="report_term_id">Term</Label>
                                        <Select
                                            value={reportFilters.term_id}
                                            onValueChange={(value) =>
                                                setReportFilters((previous) => ({
                                                    ...previous,
                                                    term_id: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_term_id">
                                                <SelectValue placeholder="Select term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reportTerms.map((term) => (
                                                    <SelectItem
                                                        key={term.id}
                                                        value={String(term.id)}
                                                    >
                                                        {term.period_code} - {term.academic_year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="report_department_id">Department</Label>
                                        <Select
                                            value={reportFilters.department_id}
                                            onValueChange={(value) =>
                                                setReportFilters((previous) => ({
                                                    ...previous,
                                                    department_id: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_department_id">
                                                <SelectValue placeholder="All departments" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((department) => (
                                                    <SelectItem
                                                        key={department.id}
                                                        value={String(
                                                            department.id,
                                                        )}
                                                    >
                                                        {department.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="report_status">Status</Label>
                                        <Select
                                            value={reportFilters.status}
                                            onValueChange={(value) =>
                                                setReportFilters((previous) => ({
                                                    ...previous,
                                                    status: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_status">
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENDING">Pending</SelectItem>
                                                <SelectItem value="FOR_REVISION">For Revision</SelectItem>
                                                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="report_faculty_search">Faculty Search</Label>
                                        <Input
                                            id="report_faculty_search"
                                            placeholder="Code or name..."
                                            value={reportFilters.faculty_search}
                                            onChange={(event) =>
                                                setReportFilters((previous) => ({
                                                    ...previous,
                                                    faculty_search:
                                                        event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('csv')}
                                        disabled={
                                            !reportFilters.academic_year &&
                                            !reportFilters.term_id
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export CSV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('xlsx')}
                                        disabled={
                                            !reportFilters.academic_year &&
                                            !reportFilters.term_id
                                        }
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Export Excel
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('pdf')}
                                        disabled={
                                            !reportFilters.academic_year &&
                                            !reportFilters.term_id
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export PDF
                                    </Button>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Academic year or term is required. Other filters are optional.
                                </p>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 max-w-sm">
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                </span>
                                <Input
                                    type="text"
                                    placeholder="Search by code, AY, or term..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {listing_mode === 'grouped' ? (
                            grouped_terms && grouped_terms.data.length > 0 ? (
                                <div className="space-y-3">
                                    {grouped_terms.data.map((group) => {
                                        const isOpen =
                                            openAcademicYears[
                                                group.academic_year
                                            ] ?? true;

                                        return (
                                            <Collapsible
                                                key={group.academic_year}
                                                open={isOpen}
                                                onOpenChange={(open) =>
                                                    setOpenAcademicYears(
                                                        (current) => ({
                                                            ...current,
                                                            [group.academic_year]:
                                                                open,
                                                        }),
                                                    )
                                                }
                                                className="overflow-hidden rounded-lg border"
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-foreground">
                                                                {group.academic_year}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {group.terms.length}{' '}
                                                                term
                                                                {group.terms.length ===
                                                                1
                                                                    ? ''
                                                                    : 's'}
                                                            </p>
                                                        </div>
                                                        <ChevronDown
                                                            className={cn(
                                                                'h-4 w-4 text-muted-foreground transition-transform',
                                                                isOpen &&
                                                                    'rotate-180',
                                                            )}
                                                        />
                                                    </button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="border-t">
                                                    {renderTermsTable(group.terms)}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
                                    No terms found.
                                </div>
                            )
                        ) : (
                            renderTermsTable(terms?.data ?? [])
                        )}

                        <TermIndexPagination pagination={pagination} />
                    </CardContent>
                </Card>
            </div>
        </StaffLayout>
    );
}
