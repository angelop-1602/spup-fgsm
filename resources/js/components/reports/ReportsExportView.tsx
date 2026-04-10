import { Head, Link, router } from '@inertiajs/react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import FacultyCommandSelect from '@/components/reports/FacultyCommandSelect';
import type {
    ReportContext,
    ReportFaculty,
    ReportPageProps,
} from '@/components/reports/types';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

type Props = ReportPageProps & {
    indexUrl: string;
    exportUrl: string;
    buildTermPdfUrl: (termId: number) => string;
    buildFacultyPdfUrl: (facultyId: number) => string;
};

type LocalFilters = {
    term_id: string;
    faculty_id: string;
    department_id: string;
    status: string;
    emp_status: string;
};

function humanizeStatus(status: string): string {
    if (status.trim() === '') {
        return '-';
    }

    if (status.trim().toUpperCase() === 'PENDING') {
        return 'Unsubmitted';
    }

    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function facultyName(faculty: ReportFaculty | null): string {
    if (!faculty) {
        return '';
    }

    return [faculty.full_name, faculty.middle_name]
        .map((value) => (value ? value.trim() : ''))
        .filter((value) => value !== '')
        .join(' ');
}

function buildQueryString(params: Record<string, string | number>): string {
    return new URLSearchParams(
        Object.entries(params).reduce(
            (acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            },
            {} as Record<string, string>,
        ),
    ).toString();
}

export default function ReportsExportView({
    loads,
    terms,
    departments,
    faculties,
    selectedFaculty,
    filters,
    indexUrl,
    exportUrl,
    buildTermPdfUrl,
    buildFacultyPdfUrl,
}: Props) {
    const appliedContext = filters.context ?? 'term';
    const appliedFilters: LocalFilters = {
        term_id: filters.term_id ? String(filters.term_id) : '',
        faculty_id: filters.faculty_id ? String(filters.faculty_id) : '',
        department_id: filters.department_id ? String(filters.department_id) : 'all',
        status: filters.status || 'all',
        emp_status: filters.emp_status || 'all',
    };

    const [localFilters, setLocalFilters] = useState<LocalFilters>(appliedFilters);
    const [activeTab, setActiveTab] = useState<ReportContext>(appliedContext);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalFilters(appliedFilters);
         
        setActiveTab(appliedContext);
    }, [
        appliedContext,
        appliedFilters.department_id,
        appliedFilters.emp_status,
        appliedFilters.faculty_id,
        appliedFilters.status,
        appliedFilters.term_id,
    ]);

    useEffect(() => {
        const allowedStatuses =
            activeTab === 'clearance'
                ? ['all', 'SUBMITTED', 'CLEARED']
                : activeTab === 'faculty'
                  ? ['all']
                  : ['all', 'PENDING', 'FOR_REVISION', 'SUBMITTED'];

        if (!allowedStatuses.includes(localFilters.status)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalFilters((current) => ({
                ...current,
                status: 'all',
            }));
        }
    }, [activeTab, localFilters.status]);

    const hasPendingChanges =
        activeTab !== appliedContext ||
        localFilters.term_id !== appliedFilters.term_id ||
        localFilters.faculty_id !== appliedFilters.faculty_id ||
        localFilters.department_id !== appliedFilters.department_id ||
        localFilters.status !== appliedFilters.status ||
        localFilters.emp_status !== appliedFilters.emp_status;

    const buildParams = (
        context: ReportContext,
        source: LocalFilters,
    ): Record<string, string | number> => {
        const params: Record<string, string | number> = { context };

        if (context === 'faculty') {
            if (source.faculty_id !== '') {
                params.faculty_id = Number(source.faculty_id);
            }

            return params;
        }

        if (source.term_id !== '') {
            params.term_id = Number(source.term_id);
        }

        if (source.department_id !== 'all') {
            params.department_id = Number(source.department_id);
        }

        if (source.status !== 'all') {
            params.status = source.status;
        }

        if (source.emp_status !== 'all') {
            params.emp_status = source.emp_status;
        }

        return params;
    };

    const appliedParams = buildParams(appliedContext, appliedFilters);
    const hasRequiredSelection =
        appliedContext === 'faculty'
            ? appliedFilters.faculty_id !== ''
            : appliedFilters.term_id !== '';
    const canExport = hasRequiredSelection && !hasPendingChanges;

    useEffect(() => {
        if (!hasPendingChanges) {
            return;
        }

        const timeout = setTimeout(() => {
            router.get(indexUrl, buildParams(activeTab, localFilters), {
                preserveState: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(timeout);
    }, [activeTab, hasPendingChanges, indexUrl, localFilters]);

    const handleExcelExport = () => {
        const queryString = buildQueryString(appliedParams);
        window.location.href = `${exportUrl}?${queryString}&format=xlsx`;
    };

    const handlePdfExport = () => {
        if (appliedContext === 'faculty') {
            const url = buildFacultyPdfUrl(Number(appliedFilters.faculty_id));
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        const queryString = buildQueryString(appliedParams);
        const url = `${buildTermPdfUrl(Number(appliedFilters.term_id))}?${queryString}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const emptyStateMessage =
        appliedContext === 'faculty'
            ? appliedFilters.faculty_id !== ''
                ? 'No unsubmitted grading sheets found for this faculty.'
                : 'Select a faculty to preview unsubmitted grading sheets across all terms.'
            : appliedFilters.term_id !== ''
              ? 'No faculty loads found.'
              : 'Select a term to preview export data.';

    return (
        <>
            <Head title="Reports / Exports" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Reports / Exports</CardTitle>
                        <CardDescription>
                            View and export faculty load submissions with
                            filters. Select a term or faculty to preview export
                            data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted p-1">
                                    {(
                                        [
                                            ['term', 'Term Exports'],
                                            ['clearance', 'Clearance Exports'],
                                            ['faculty', 'Per Faculty'],
                                        ] as const
                                    ).map(([tab, label]) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                'rounded-md px-3.5 py-1.5 text-sm transition-colors',
                                                activeTab === tab
                                                    ? 'bg-background text-foreground shadow-xs ring-1 ring-border/60 dark:bg-neutral-900'
                                                    : 'text-muted-foreground hover:bg-background/70 dark:hover:bg-neutral-800/70',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={!canExport}
                                        onClick={handleExcelExport}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        {appliedContext === 'faculty'
                                            ? 'Export Faculty Excel'
                                            : appliedContext === 'clearance'
                                              ? 'Export Clearance Excel'
                                              : 'Export Term Excel'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={!canExport}
                                        onClick={handlePdfExport}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        {appliedContext === 'faculty'
                                            ? 'Export Faculty PDF'
                                            : appliedContext === 'clearance'
                                              ? 'Export Clearance PDF'
                                              : 'Export Term PDF'}
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                                {activeTab === 'faculty' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="faculty_id">Faculty</Label>
                                        <FacultyCommandSelect
                                            faculties={faculties}
                                            value={localFilters.faculty_id}
                                            onValueChange={(value) =>
                                                setLocalFilters((current) => ({
                                                    ...current,
                                                    faculty_id: value,
                                                }))
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This export includes all
                                            unsubmitted grading sheets across
                                            all terms for the selected faculty.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="term_id">Term</Label>
                                            <Select
                                                value={localFilters.term_id}
                                                onValueChange={(value) =>
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        term_id: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger id="term_id">
                                                    <SelectValue placeholder="Select term" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {terms.map((term) => (
                                                        <SelectItem
                                                            key={term.id}
                                                            value={String(term.id)}
                                                        >
                                                            {term.period_code} -{' '}
                                                            {term.academic_year}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="department_id">
                                                Department
                                            </Label>
                                            <Select
                                                value={localFilters.department_id}
                                                onValueChange={(value) =>
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        department_id: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger id="department_id">
                                                    <SelectValue placeholder="All departments" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        All departments
                                                    </SelectItem>
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
                                            <Label htmlFor="status">Status</Label>
                                            <Select
                                                value={localFilters.status}
                                                onValueChange={(value) =>
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        status: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger id="status">
                                                    <SelectValue placeholder="All statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        All statuses
                                                    </SelectItem>
                                                    {activeTab === 'clearance' ? (
                                                        <>
                                                            <SelectItem value="SUBMITTED">
                                                                Submitted
                                                            </SelectItem>
                                                            <SelectItem value="CLEARED">
                                                                Cleared
                                                            </SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="PENDING">
                                                                Pending
                                                            </SelectItem>
                                                            <SelectItem value="FOR_REVISION">
                                                                For Revision
                                                            </SelectItem>
                                                            <SelectItem value="SUBMITTED">
                                                                Submitted
                                                            </SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="emp_status">
                                                Emp Status
                                            </Label>
                                            <Select
                                                value={localFilters.emp_status}
                                                onValueChange={(value) =>
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        emp_status: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger id="emp_status">
                                                    <SelectValue placeholder="All employment statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        All employment statuses
                                                    </SelectItem>
                                                    <SelectItem value="full-time">
                                                        Full-time
                                                    </SelectItem>
                                                    <SelectItem value="part-time">
                                                        Part-time
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {appliedContext === 'faculty' && selectedFaculty && (
                            <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Faculty
                                        </p>
                                        <p className="font-medium">
                                            {facultyName(selectedFaculty)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedFaculty.faculty_code}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Department
                                        </p>
                                        <p className="font-medium">
                                            {selectedFaculty.department?.name ??
                                                'No department'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Emp Status
                                        </p>
                                        <p className="font-medium">
                                            {selectedFaculty.emp_status || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {appliedContext === 'faculty' ? (
                                        <>
                                            <TableHead>Term</TableHead>
                                            <TableHead>Academic Year</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>Units</TableHead>
                                            <TableHead>Status</TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead>Faculty Name</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Subjects</TableHead>
                                            <TableHead>Total Units</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Emp Status</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loads.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={
                                                appliedContext === 'faculty'
                                                    ? 5
                                                    : 6
                                            }
                                            className="text-center text-muted-foreground"
                                        >
                                            {emptyStateMessage}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    loads.data.map((load) => (
                                        <TableRow key={load.id}>
                                            {appliedContext === 'faculty' ? (
                                                <>
                                                    <TableCell>
                                                        {load.term.period_code}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.term.academic_year}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.subject_code ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.section ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.total_units !== null &&
                                                        load.total_units !==
                                                            undefined
                                                            ? Number(load.total_units).toFixed(2)
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {humanizeStatus(
                                                            load.status,
                                                        )}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell>
                                                        {facultyName(load.faculty)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.department?.name ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.items_count ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.total_units_sum !==
                                                        null
                                                            ? Number(
                                                                  load.total_units_sum,
                                                              ).toFixed(2)
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {humanizeStatus(
                                                            load.status,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {load.faculty?.emp_status ??
                                                            '-'}
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {loads.links && loads.links.length > 3 && (
                            <div className="mt-4 flex justify-center gap-2">
                                {loads.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`rounded border px-3 py-1 ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent'
                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                    >
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
