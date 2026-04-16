import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    TermCompletionBadge,
    TermStatusBadge,
} from '@/components/term-state';
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
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DeanLayout from '@/layouts/DeanLayout';
import deanRoutes from '@/routes/dean';
import type { BreadcrumbItem } from '@/types';

type Term = {
    id: number;
    period_code: string;
    term_name: string;
    academic_year: string;
    is_active: boolean;
    total_loads: number;
    completed_loads: number;
};

type LoadItem = {
    id: number;
    subject_code: string | null;
    section: string | null;
    schedule: string | null;
    room: string | null;
    units_lec: string | number | null;
    units_lab: string | number | null;
    total_units: string | number | null;
    status: 'PENDING' | 'RETURNED' | 'SUBMITTED' | string;
    remarks: string | null;
    raw_payload_json?: {
        subject_description?: string | null;
        units?: string | number | null;
        hours?: string | number | null;
        size?: string | number | null;
        load_units?: string | number | null;
    } | null;
};

type Load = {
    id: number;
    status: 'PENDING' | 'FOR_REVISION' | 'SUBMITTED' | string;
    faculty: {
        id: number;
        faculty_code: string;
        full_name: string;
    } | null;
    items: LoadItem[];
};

type Props = {
    term: Term;
    load: Load;
};

function displayValue(value: unknown): string {
    const normalized = String(value ?? '').trim();

    return normalized === '' ? '-' : normalized;
}

function toNumber(value: unknown): number {
    const normalized = String(value ?? '')
        .trim()
        .replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
}

function formatTotal(value: number): string {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function loadProgressBadge(submitted: number, total: number) {
    if (total > 0 && submitted >= total) {
        return (
            <Badge className="bg-emerald-500 text-emerald-50">
                Completed {submitted}/{total}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-slate-400 text-slate-700">
            Submitted {submitted}/{total}
        </Badge>
    );
}

function itemStatusBadge(status: LoadItem['status']) {
    if (status === 'SUBMITTED') {
        return (
            <Badge className="bg-emerald-500 text-emerald-50">Submitted</Badge>
        );
    }

    if (status === 'RETURNED') {
        return (
            <Badge variant="outline" className="border-amber-500 text-amber-700">
                Returned
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-slate-400 text-slate-700">
            Pending
        </Badge>
    );
}

export default function FacultyLoadShow({ term, load }: Props) {
    const isInactive = !term.is_active;
    const termLoadsHref = deanRoutes.terms.facultyLoads.show({
        term: term.id,
    }).url;

    const totals = load.items.reduce(
        (acc, item) => {
            acc.units += toNumber(item.raw_payload_json?.units);
            acc.loadUnits += toNumber(
                item.raw_payload_json?.load_units ?? item.total_units,
            );
            acc.lecUnits += toNumber(item.units_lec);
            acc.labUnits += toNumber(item.units_lab);
            acc.hours += toNumber(item.raw_payload_json?.hours);

            return acc;
        },
        {
            units: 0,
            loadUnits: 0,
            lecUnits: 0,
            labUnits: 0,
            hours: 0,
        },
    );
    const totalSubjects = load.items.length;
    const submittedSubjects = load.items.filter(
        (item) => item.status === 'SUBMITTED',
    ).length;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dean Dashboard', href: deanRoutes.dashboard().url },
        { title: 'Terms', href: deanRoutes.terms.index().url },
        { title: `${term.period_code} Faculty Loads`, href: termLoadsHref },
        {
            title: `Load #${load.id}`,
            href: deanRoutes.terms.facultyLoads.view({
                term: term.id,
                facultyLoad: load.id,
            }).url,
        },
    ];

    return (
        <DeanLayout breadcrumbs={breadcrumbs}>
            <Head title={`Faculty Load #${load.id}`} />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>
                                {term.term_name} - {term.academic_year}
                            </CardTitle>
                            <CardDescription>
                                {load.faculty?.faculty_code ?? '-'} -{' '}
                                {load.faculty?.full_name ?? '-'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <TermStatusBadge isActive={term.is_active} />
                            <TermCompletionBadge
                                completed={term.completed_loads}
                                total={term.total_loads}
                            />
                            {loadProgressBadge(submittedSubjects, totalSubjects)}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Loads
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isInactive && (
                            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                This term is inactive.
                            </div>
                        )}

                        <div className="overflow-hidden rounded-lg border">
                            <table className="w-full table-auto text-sm">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[14%] px-3 py-3">
                                            Subject Code
                                        </TableHead>
                                        <TableHead className="w-[20%] px-3 py-3">
                                            Subject Description
                                        </TableHead>
                                        <TableHead className="w-[28%] px-3 py-3">
                                            Class
                                        </TableHead>
                                        <TableHead className="w-[20%] px-3 py-3">
                                            Units
                                        </TableHead>
                                        <TableHead className="w-[18%] px-3 py-3">
                                            Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {load.items.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="px-3 py-10 text-center text-muted-foreground"
                                            >
                                                No load items found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        load.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="px-3 py-4 align-top">
                                                    <p className="font-medium break-words">
                                                        {displayValue(
                                                            item.subject_code,
                                                        )}
                                                    </p>
                                                    {item.status === 'RETURNED' &&
                                                        item.remarks && (
                                                            <p className="mt-1 break-words text-amber-700">
                                                                Remarks:{' '}
                                                                {item.remarks}
                                                            </p>
                                                        )}
                                                </TableCell>
                                                <TableCell className="px-3 py-4 align-top">
                                                    <p className="leading-6 break-words text-muted-foreground">
                                                        {displayValue(
                                                            item
                                                                .raw_payload_json
                                                                ?.subject_description,
                                                        )}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="px-3 py-4 align-top">
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Sec:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item.section,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Sched:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item.schedule,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Room:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item.room,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Size:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item
                                                                .raw_payload_json
                                                                ?.size,
                                                        )}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="px-3 py-4 align-top">
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Lec:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item.units_lec,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Lab:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item.units_lab,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Total:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item
                                                                .raw_payload_json
                                                                ?.load_units ??
                                                                item.total_units,
                                                        )}
                                                    </p>
                                                    <p className="leading-6 break-words">
                                                        <span className="text-muted-foreground">
                                                            Hours:
                                                        </span>{' '}
                                                        {displayValue(
                                                            item
                                                                .raw_payload_json
                                                                ?.hours,
                                                        )}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="px-3 py-4 align-top flex justify-start">
                                                    <div className="flex min-h-8 justify-center items-center">
                                                        {itemStatusBadge(
                                                            item.status,
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                                {load.items.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="px-3 py-3 font-semibold"
                                            >
                                                Totals
                                            </TableCell>
                                            <TableCell className="px-3 py-3 align-top font-medium">
                                                <p>
                                                    Units:{' '}
                                                    {formatTotal(totals.units)}
                                                </p>
                                                <p>
                                                    Load Units:{' '}
                                                    {formatTotal(
                                                        totals.loadUnits,
                                                    )}
                                                </p>
                                                <p>
                                                    Lec Units:{' '}
                                                    {formatTotal(
                                                        totals.lecUnits,
                                                    )}
                                                </p>
                                                <p>
                                                    Lab Units:{' '}
                                                    {formatTotal(
                                                        totals.labUnits,
                                                    )}
                                                </p>
                                                <p>
                                                    Hours:{' '}
                                                    {formatTotal(totals.hours)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="px-3 py-3" />
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DeanLayout>
    );
}
