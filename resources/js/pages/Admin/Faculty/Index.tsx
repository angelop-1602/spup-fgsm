import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem, PaginatedResponse } from '@/types';

type Department = {
    id: number;
    name: string;
    code?: string | null;
};

type Faculty = {
    id: number;
    faculty_code: string;
    full_name: string;
    middle_name: string | null;
    call_name: string | null;
    contact_no: string | null;
    email: string | null;
    emp_type: string | null;
    emp_status: string | null;
    supervisor: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    department: Department | null;
};

type ImportSummary = {
    created: number;
    updated: number;
    skipped: number;
    issues: string[];
    has_more_issues: boolean;
};

type Props = {
    faculty: PaginatedResponse<Faculty>;
    filters: {
        q?: string;
        per_page?: number;
    };
    importSummary?: ImportSummary | null;
};

type PreviewRow = {
    row: number;
    code: string;
    name: string;
    middle_name: string;
    call_name: string;
    contact_no: string;
    email: string;
    emp_type: string;
    emp_status: string;
    supervisor: string;
    dept: string;
};

type PreviewData = {
    fileName: string;
    headerRow: number;
    totalRows: number;
    previewRows: PreviewRow[];
    hasMoreRows: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: adminRoutes.dashboard().url },
    { title: 'Faculty Masterlist', href: adminRoutes.faculty.index().url },
];

const facultyTableHeaders = [
    'Code',
    'Name',
    'Call Name',
    'Dept',
    'Emp Status',
    'Actions',
];

const previewHeaders = [
    'Code',
    'Name',
    'Middle Name',
    'Call Name',
    'Contact No',
    'Email',
    'Emp Type',
    'Emp Status',
    'Supervisor',
    'Dept',
];

const aliases = {
    code: ['code'],
    name: ['name'],
    middle_name: ['middle name'],
    call_name: ['call name'],
    contact_no: ['contact no', 'contact no.', 'contact number'],
    email: ['email'],
    emp_type: ['emp type', 'employment type'],
    emp_status: ['emp status', 'employment status'],
    supervisor: ['supervisor'],
    dept: ['dept', 'department'],
} as const;

const PREVIEW_LIMIT = 30;
const perPageOptions = ['10', '25', '50', '100'];

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

const normalize = (v: unknown) => String(v ?? '').trim();
const normalizeHeader = (v: unknown) =>
    normalize(v).toLowerCase().replaceAll('.', '').replace(/\s+/g, ' ');

function rowIsEmpty(row: unknown[]): boolean {
    return row.every((v) => normalize(v) === '');
}

function findHeader(rows: unknown[][]): {
    idx: number;
    map: Record<string, number>;
} | null {
    for (let idx = 0; idx < rows.length; idx += 1) {
        const map: Record<string, number> = {};
        (rows[idx] ?? []).forEach((cell, col) => {
            const key = normalizeHeader(cell);
            if (key) map[key] = col;
        });

        const hasCode = aliases.code.some(
            (k) => map[normalizeHeader(k)] !== undefined,
        );
        const hasName = aliases.name.some(
            (k) => map[normalizeHeader(k)] !== undefined,
        );
        const hasDept = aliases.dept.some(
            (k) => map[normalizeHeader(k)] !== undefined,
        );

        if (hasCode && hasName && hasDept) {
            return { idx, map };
        }
    }

    return null;
}

function val(
    row: unknown[],
    map: Record<string, number>,
    key: keyof typeof aliases,
): string {
    for (const alias of aliases[key]) {
        const col = map[normalizeHeader(alias)];
        if (col !== undefined) return normalize(row[col]);
    }

    return '';
}
async function parseFile(file: File): Promise<PreviewData> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error('No worksheet found in the selected file.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
    });

    const header = findHeader(rows);

    if (!header) {
        throw new Error(
            'Header row not found. Required columns: Code, Name, Dept.',
        );
    }

    const parsed: PreviewRow[] = [];

    for (let i = header.idx + 1; i < rows.length; i += 1) {
        const row = rows[i] ?? [];

        if (rowIsEmpty(row)) {
            continue;
        }

        const rowNo = i + 1;

        const item: PreviewRow = {
            row: rowNo,
            code: val(row, header.map, 'code'),
            name: val(row, header.map, 'name'),
            middle_name: val(row, header.map, 'middle_name'),
            call_name: val(row, header.map, 'call_name'),
            contact_no: val(row, header.map, 'contact_no'),
            email: val(row, header.map, 'email'),
            emp_type: val(row, header.map, 'emp_type'),
            emp_status: val(row, header.map, 'emp_status'),
            supervisor: val(row, header.map, 'supervisor'),
            dept: val(row, header.map, 'dept'),
        };

        parsed.push(item);
    }

    return {
        fileName: file.name,
        headerRow: header.idx + 1,
        totalRows: parsed.length,
        previewRows: parsed.slice(0, PREVIEW_LIMIT),
        hasMoreRows: parsed.length > PREVIEW_LIMIT,
    };
}

export default function FacultyIndex({
    faculty,
    filters,
    importSummary,
}: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [rowsPerPage, setRowsPerPage] = useState(
        String(filters.per_page ?? faculty.per_page ?? 10),
    );
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const summaryRef = useRef('');

    const importForm = useForm<{ file: File | null }>({ file: null });

    const buildListParams = (page?: number) => ({
        q: search || undefined,
        per_page: Number(rowsPerPage),
        page,
    });

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                adminRoutes.faculty.index().url,
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
    }, [search, rowsPerPage]);

    useEffect(() => {
        if (!importSummary) return;

        const key = JSON.stringify(importSummary);
        if (summaryRef.current === key) return;
        summaryRef.current = key;

        toast.success('Faculty import saved', {
            description: `${importSummary.created} created, ${importSummary.updated} updated, ${importSummary.skipped} skipped.`,
        });

        if (importSummary.issues.length > 0) {
            toast.warning('Some rows were skipped', {
                description: importSummary.has_more_issues
                    ? `${importSummary.issues[0]} (and more)`
                    : importSummary.issues[0],
            });
        }
    }, [importSummary]);

    const handleDelete = (facultyId: number) => {
        if (confirm('Are you sure you want to delete this faculty member?')) {
            router.delete(
                adminRoutes.faculty.destroy({ faculty: facultyId }).url,
            );
        }
    };

    const handleRowsPerPageChange = (value: string) => {
        setRowsPerPage(value);
    };

    const goToPage = (page: number) => {
        if (
            page < 1 ||
            page > faculty.last_page ||
            page === faculty.current_page
        ) {
            return;
        }

        router.get(adminRoutes.faculty.index().url, buildListParams(page), {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    };
    const resetImport = () => {
        importForm.reset();
        setPreviewData(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openPicker = () => {
        if (!previewLoading && !importForm.processing) {
            fileInputRef.current?.click();
        }
    };

    const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        importForm.setData('file', file);
        setPreviewLoading(true);

        try {
            const preview = await parseFile(file);
            setPreviewData(preview);
            setPreviewOpen(true);

            toast.success('XLSX parsed', {
                description: `Header found at row A${preview.headerRow}. Review and confirm import.`,
            });
        } catch (error) {
            importForm.setData('file', null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Unable to parse file.',
            );
        } finally {
            setPreviewLoading(false);
        }
    };

    const onDialogChange = (open: boolean) => {
        if (importForm.processing) return;

        setPreviewOpen(open);

        if (!open) {
            resetImport();
        }
    };

    const confirmImport = () => {
        if (!importForm.data.file) {
            toast.error('Choose an XLSX file first.');
            return;
        }

        importForm.post('/admin/faculty/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setPreviewOpen(false);
                resetImport();
            },
            onError: (errors) => {
                toast.error(errors.file ?? 'Import failed. Please try again.');
            },
        });
    };

    const paginationItems = buildPageItems(
        faculty.current_page,
        faculty.last_page,
    );

    const showingFrom = faculty.from ?? 0;
    const showingTo = faculty.to ?? 0;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Faculty Masterlist" />

            <Dialog open={previewOpen} onOpenChange={onDialogChange}>
                <DialogContent className="flex max-h-[90vh] max-w-[96vw] flex-col overflow-hidden p-0 md:max-w-6xl">
                    <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle>Review Faculty Import</DialogTitle>
                        <DialogDescription>
                            {previewData
                                ? `File: ${previewData.fileName}. Header detected at row A${previewData.headerRow}.`
                                : 'Preview your XLSX file before saving.'}
                        </DialogDescription>
                    </DialogHeader>

                    {previewData && (
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            <div className="space-y-4">
                                <div className="max-h-[50vh] overflow-x-auto overflow-y-auto rounded-md border">
                                    <table className="w-max min-w-full caption-bottom text-sm">
                                        <thead className="[&_tr]:border-b">
                                            <tr className="border-b transition-colors hover:bg-muted/50">
                                                {previewHeaders.map(
                                                    (header) => (
                                                        <th
                                                            key={header}
                                                            className="sticky top-0 z-10 h-12 bg-background px-4 text-left align-middle font-medium whitespace-nowrap text-muted-foreground"
                                                        >
                                                            {header}
                                                        </th>
                                                    ),
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="[&_tr:last-child]:border-0">
                                            {previewData.previewRows.map(
                                                (row) => (
                                                    <tr
                                                        key={`${row.row}-${row.code}-${row.name}`}
                                                        className="border-b transition-colors hover:bg-muted/50"
                                                    >
                                                        <td className="px-4 py-2 align-middle font-mono whitespace-nowrap">
                                                            {row.code || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.name || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.middle_name ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.call_name ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.contact_no ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.email || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.emp_type ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.emp_status ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.supervisor ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.dept || '-'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t px-6 py-4 sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            No data is saved until you click Confirm & Save.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onDialogChange(false)}
                                disabled={importForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={confirmImport}
                                disabled={importForm.processing || !previewData}
                            >
                                {importForm.processing
                                    ? 'Saving...'
                                    : 'Confirm & Save'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Faculty Masterlist</CardTitle>
                            <CardDescription>
                                Manage faculty members and import from your XLSX
                                file format.
                            </CardDescription>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={onFileChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={openPicker}
                                disabled={
                                    previewLoading || importForm.processing
                                }
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {previewLoading
                                    ? 'Parsing...'
                                    : importForm.processing
                                      ? 'Importing...'
                                      : 'Import XLSX'}
                            </Button>

                            <Link href={adminRoutes.faculty.create().url}>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Faculty
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="mb-4 max-w-sm">
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                </span>
                                <Input
                                    type="text"
                                    placeholder="Search by code or name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="rounded-md border">
                            <table className="w-max min-w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50">
                                        {facultyTableHeaders.map((header) => (
                                            <th
                                                key={header}
                                                className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap text-muted-foreground"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {faculty.data.length === 0 ? (
                                        <tr className="border-b transition-colors hover:bg-muted/50">
                                            <td
                                                colSpan={
                                                    facultyTableHeaders.length
                                                }
                                                className="px-4 py-2 text-center align-middle text-muted-foreground"
                                            >
                                                No faculty members found.
                                            </td>
                                        </tr>
                                    ) : (
                                        faculty.data.map((member) => (
                                            <tr
                                                key={member.id}
                                                className="border-b transition-colors hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-2 align-middle font-mono whitespace-nowrap">
                                                    {member.faculty_code}
                                                </td>
                                                <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                    {member.full_name}
                                                </td>
                                                <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                    {member.call_name ?? '-'}
                                                </td>
                                                <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                    {member.department?.code ??
                                                        member.department
                                                            ?.name ??
                                                        '-'}
                                                </td>
                                                <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                    {member.emp_status ?? '-'}
                                                </td>
                                                <td className="px-4 py-2 align-middle">
                                                    <InlineActions>
                                                        <InlineActionButton
                                                            icon={Pencil}
                                                            label="Edit"
                                                            onClick={() =>
                                                                router.visit(
                                                                    adminRoutes.faculty.edit(
                                                                        {
                                                                            faculty:
                                                                                member.id,
                                                                        },
                                                                    ).url,
                                                                )
                                                            }
                                                        />
                                                        <InlineActionButton
                                                            icon={Trash2}
                                                            label="Delete"
                                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    member.id,
                                                                )
                                                            }
                                                        />
                                                    </InlineActions>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                    Rows per page
                                </span>
                                <Select
                                    value={rowsPerPage}
                                    onValueChange={handleRowsPerPageChange}
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
                                {faculty.total} faculty
                            </p>

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(1)}
                                    disabled={faculty.current_page <= 1}
                                    aria-label="First page"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        goToPage(faculty.current_page - 1)
                                    }
                                    disabled={faculty.current_page <= 1}
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
                                                item === faculty.current_page
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
                                        goToPage(faculty.current_page + 1)
                                    }
                                    disabled={
                                        faculty.current_page >=
                                        faculty.last_page
                                    }
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => goToPage(faculty.last_page)}
                                    disabled={
                                        faculty.current_page >=
                                        faculty.last_page
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
        </AdminLayout>
    );
}
