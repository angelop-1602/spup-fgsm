import { Head, Link, router } from '@inertiajs/react';
import { Download, FileSpreadsheet, MoreVertical, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import StaffLayout from '@/layouts/StaffLayout';
import staffRoutes from '@/routes/staff';
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
    terms: PaginatedResponse<Term>;
    filters: {
        q?: string;
    };
    reportTerms: ReportTerm[];
    departments: Department[];
    autoLockEnabled: boolean;
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
    terms,
    filters,
    reportTerms,
    departments,
    autoLockEnabled,
}: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportFilters, setReportFilters] = useState({
        term_id: '',
        academic_year: '',
        department_id: '',
        status: '',
        faculty_search: '',
    });

    const academicYears = Array.from(
        new Set(reportTerms.map((term) => term.academic_year)),
    ).sort((a, b) => b.localeCompare(a));

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                staffRoutes.terms.index().url,
                { q: search || undefined },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const handleReportExport = (format: 'csv' | 'xlsx' | 'pdf') => {
        // Prefer academic year export when selected; otherwise require a specific term
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
            Object.entries(params).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            }, {} as Record<string, string>),
        ).toString();

        window.location.href = `${staffRoutes.reports.export().url}?${queryString}`;
    };

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
                        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
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
                                                setReportFilters((prev) => ({
                                                    ...prev,
                                                    academic_year: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_academic_year">
                                                <SelectValue placeholder="All years (use Term below)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears.map((ay) => (
                                                    <SelectItem key={ay} value={ay}>
                                                        {ay}
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
                                                setReportFilters((prev) => ({
                                                    ...prev,
                                                    term_id: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_term_id">
                                                <SelectValue placeholder="Select term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reportTerms.map((term) => (
                                                    <SelectItem key={term.id} value={String(term.id)}>
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
                                                setReportFilters((prev) => ({
                                                    ...prev,
                                                    department_id: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="report_department_id">
                                                <SelectValue placeholder="All departments" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={String(dept.id)}>
                                                        {dept.name}
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
                                                setReportFilters((prev) => ({
                                                    ...prev,
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
                                            onChange={(e) =>
                                                setReportFilters((prev) => ({
                                                    ...prev,
                                                    faculty_search: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('csv')}
                                        disabled={!reportFilters.academic_year && !reportFilters.term_id}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export CSV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('xlsx')}
                                        disabled={!reportFilters.academic_year && !reportFilters.term_id}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Export Excel
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReportExport('pdf')}
                                        disabled={!reportFilters.academic_year && !reportFilters.term_id}
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
                                    placeholder="Search by code or AY..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terms.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No terms found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    terms.data.map((term) => (
                                        <TableRow key={term.id}>
                                            <TableCell className="text-left">{term.period_code}</TableCell>
                                            <TableCell>{term.term_name}</TableCell>
                                            <TableCell>{term.academic_year}</TableCell>
                                            <TableCell>
                                                {!term.is_active ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-red-500 text-red-600"
                                                    >
                                                        Inactive
                                                    </Badge>
                                                ) : autoLockEnabled ? (
                                                    term.is_completed ? (
                                                        term.admin_override_unlocked ? (
                                                            <Badge className="bg-emerald-500 text-emerald-50">
                                                                Unlocked
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Locked</Badge>
                                                        )
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-emerald-500 text-emerald-600"
                                                        >
                                                            Open
                                                        </Badge>
                                                    )
                                                ) : term.is_completed ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-500 text-blue-600"
                                                    >
                                                        Completed
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-emerald-500 text-emerald-600"
                                                    >
                                                        Open
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.visit(
                                                                    `/staff/terms/${term.id}/faculty-loads`,
                                                                )
                                                            }
                                                        >
                                                            Manage Faculty Loads
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {terms.links && terms.links.length > 3 && (
                            <div className="mt-4 flex justify-center gap-2">
                                {terms.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 rounded border ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </StaffLayout>
    );
}
