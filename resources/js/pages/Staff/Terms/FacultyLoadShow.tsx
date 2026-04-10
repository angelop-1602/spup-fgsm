import { Head, router } from '@inertiajs/react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import StaffLayout from '@/layouts/StaffLayout';
import staffRoutes from '@/routes/staff';
import type { BreadcrumbItem } from '@/types';

type Term = {
    id: number;
    period_code: string;
    term_name: string;
    academic_year: string;
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
    isLocked: boolean;
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
            <Badge
                variant="outline"
                className="border-amber-500 text-amber-700"
            >
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

export default function FacultyLoadShow({ term, load, isLocked }: Props) {
    const termLoadsHref = `/staff/terms/${term.id}/faculty-loads`;
    const [returnDialogItem, setReturnDialogItem] = useState<LoadItem | null>(
        null,
    );
    const [returnRemarks, setReturnRemarks] = useState('');
    const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

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

    const updateItemStatus = (
        item: LoadItem,
        status: 'PENDING' | 'RETURNED' | 'SUBMITTED',
        remarks?: string,
    ) => {
        if (isLocked) {
            toast.error(
                'This term is locked. Unlock it before updating subject statuses.',
            );
            return;
        }

        setUpdatingItemId(item.id);

        router.patch(
            `/staff/terms/${term.id}/faculty-loads/${load.id}/items/${item.id}/status`,
            {
                status,
                remarks,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (status === 'RETURNED') {
                        setReturnDialogItem(null);
                        setReturnRemarks('');
                    }

                    toast.success('Subject status updated.', {
                        description: `${displayValue(item.subject_code)} is now ${status.toLowerCase()}.`,
                    });
                },
                onError: (errors) => {
                    toast.error(
                        errors.remarks ??
                            errors.status ??
                            'Unable to update subject status.',
                    );
                },
                onFinish: () => {
                    setUpdatingItemId(null);
                },
            },
        );
    };

    const openReturnedDialog = (item: LoadItem) => {
        if (isLocked) {
            toast.error(
                'This term is locked. Unlock it before updating subject statuses.',
            );
            return;
        }

        setReturnDialogItem(item);
        setReturnRemarks(item.remarks ?? '');
    };

    const closeReturnedDialog = (open: boolean) => {
        if (!open && updatingItemId !== null) {
            return;
        }

        if (!open) {
            setReturnDialogItem(null);
            setReturnRemarks('');
        }
    };

    const submitReturnedStatus = () => {
        if (returnDialogItem === null) {
            return;
        }

        const trimmedRemarks = returnRemarks.trim();
        if (trimmedRemarks === '') {
            toast.error('Remarks are required when returning a subject.');
            return;
        }

        updateItemStatus(returnDialogItem, 'RETURNED', trimmedRemarks);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Staff Dashboard', href: staffRoutes.dashboard().url },
        { title: 'Terms', href: staffRoutes.terms.index().url },
        { title: `${term.period_code} Faculty Loads`, href: termLoadsHref },
        {
            title: `Load #${load.id}`,
            href: `/staff/terms/${term.id}/faculty-loads/${load.id}`,
        },
    ];

    return (
        <StaffLayout breadcrumbs={breadcrumbs}>
            <Head title={`Faculty Load #${load.id}`} />

            <Dialog
                open={returnDialogItem !== null}
                onOpenChange={closeReturnedDialog}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Return Subject</DialogTitle>
                        <DialogDescription>
                            Add remarks explaining why this subject is returned.
                            Remarks are required.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Subject:{' '}
                            {returnDialogItem
                                ? `${displayValue(returnDialogItem.subject_code)} - ${displayValue(returnDialogItem.section)}`
                                : '-'}
                        </p>
                        <textarea
                            value={returnRemarks}
                            onChange={(event) =>
                                setReturnRemarks(event.target.value)
                            }
                            rows={5}
                            placeholder="Enter remarks..."
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            disabled={updatingItemId !== null}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeReturnedDialog(false)}
                            disabled={updatingItemId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={submitReturnedStatus}
                            disabled={updatingItemId !== null}
                        >
                            {updatingItemId !== null
                                ? 'Saving...'
                                : 'Return Subject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            {loadProgressBadge(
                                submittedSubjects,
                                totalSubjects,
                            )}
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
                        {isLocked && (
                            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                This term is currently locked. Subject statuses
                                cannot be updated.
                            </div>
                        )}

                        <div className="overflow-hidden rounded-lg border">
                            <Table className="table-fixed text-sm">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[14%] px-4 py-3">
                                            Subject Code
                                        </TableHead>
                                        <TableHead className="w-[20%] px-4 py-3">
                                            Subject Description
                                        </TableHead>
                                        <TableHead className="w-[24%] px-4 py-3">
                                            Class
                                        </TableHead>
                                        <TableHead className="w-[14%] px-4 py-3">
                                            Units
                                        </TableHead>
                                        <TableHead className="w-[8%] px-4 py-3">
                                            Status
                                        </TableHead>
                                        <TableHead className="w-[8%] px-4 py-3">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {load.items.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                No load items found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        load.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="px-4 py-4 align-top">
                                                    <p className="font-medium break-words">
                                                        {displayValue(
                                                            item.subject_code,
                                                        )}
                                                    </p>
                                                    {item.status ===
                                                        'RETURNED' &&
                                                        item.remarks && (
                                                            <p className="mt-1 break-words text-amber-700">
                                                                Remarks:{' '}
                                                                {item.remarks}
                                                            </p>
                                                        )}
                                                </TableCell>
                                                <TableCell className="px-4 py-4 align-top">
                                                    <p className="leading-6 break-words text-muted-foreground">
                                                        {displayValue(
                                                            item
                                                                .raw_payload_json
                                                                ?.subject_description,
                                                        )}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 align-top">
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
                                                <TableCell className="px-4 py-4 align-top">
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
                                                <TableCell className="px-4 py-4 align-top">
                                                    <div className="flex min-h-8 items-start">
                                                        {itemStatusBadge(
                                                            item.status,
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 align-top">
                                                    <div className="flex min-h-8 justify-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    aria-label={`Update status for ${displayValue(item.subject_code)}`}
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    disabled={
                                                                        isLocked ||
                                                                        updatingItemId !==
                                                                            null ||
                                                                        item.status ===
                                                                            'PENDING'
                                                                    }
                                                                    onClick={() =>
                                                                        updateItemStatus(
                                                                            item,
                                                                            'PENDING',
                                                                        )
                                                                    }
                                                                >
                                                                    Set Pending
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={
                                                                        isLocked ||
                                                                        updatingItemId !==
                                                                            null ||
                                                                        item.status ===
                                                                            'SUBMITTED'
                                                                    }
                                                                    onClick={() =>
                                                                        updateItemStatus(
                                                                            item,
                                                                            'SUBMITTED',
                                                                        )
                                                                    }
                                                                >
                                                                    Set
                                                                    Submitted
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={
                                                                        isLocked ||
                                                                        updatingItemId !==
                                                                            null
                                                                    }
                                                                    onClick={() =>
                                                                        openReturnedDialog(
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    Return with
                                                                    Remarks
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                                                className="px-4 py-3 font-semibold"
                                            >
                                                Totals
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-top font-medium">
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
                                            <TableCell className="px-4 py-3" />
                                            <TableCell className="px-4 py-3" />
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </StaffLayout>
    );
}

