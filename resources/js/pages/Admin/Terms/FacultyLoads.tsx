import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    Pencil,
    Plus,
    Search,
    Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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

type FacultyOption = {
    id: number;
    faculty_code: string;
    full_name: string;
    department_id: number | null;
    department: Department | null;
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

type ImportSummary = {
    action: 'created' | 'updated';
    imported_rows: number;
    skipped_rows: number;
    header_row: number;
    issues: string[];
    has_more_issues: boolean;
};

type Props = {
    term: Term;
    loads: PaginatedResponse<FacultyLoad>;
    facultyOptions: FacultyOption[];
    assignedFacultyIds: number[];
    filters: {
        q?: string;
        per_page?: number;
    };
    importSummary?: ImportSummary | null;
};

type PreviewRow = {
    row: number;
    code: string;
    section: string;
    subject_code: string;
    subject_description: string;
    units: string;
    load_units: string;
    lec_units: string;
    lab_units: string;
    hours: string;
    schedule: string;
    room: string;
    size: string;
};

type PreviewData = {
    fileName: string;
    headerRow: number;
    totalRows: number;
    previewRows: PreviewRow[];
    hasMoreRows: boolean;
};

const previewHeaders = [
    'Row',
    'Code',
    'Section',
    'Subject Code',
    'Subject Description',
    'Units',
    'Load Units',
    'Lec Units',
    'Lab Units',
    'Hours',
    'Schedule',
    'Room',
    'Size',
];

const perPageOptions = ['10', '25', '50'];
const PREVIEW_LIMIT = 30;

const aliases = {
    code: ['code'],
    section: ['section'],
    subject_code: ['subject code', 'subjectcode', 'subj code', 'subjcode'],
    subject_description: ['subject description', 'subjectdescription'],
    units: ['units'],
    load_units: ['load units', 'loadunits'],
    lec_units: ['lec units', 'lecunits', 'lecture units', 'lectureunits'],
    lab_units: ['lab units', 'labunits'],
    hours: ['hours'],
    schedule: ['schedule'],
    room: ['room'],
    size: ['size'],
} as const;

function normalize(value: unknown): string {
    return String(value ?? '').trim();
}

function normalizeHeader(value: unknown): string {
    return normalize(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function rowIsEmpty(row: unknown[]): boolean {
    return row.every((value) => normalize(value) === '');
}

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

function findHeader(rows: unknown[][]): {
    idx: number;
    map: Record<string, number>;
} | null {
    for (let idx = 0; idx < rows.length; idx += 1) {
        const map: Record<string, number> = {};

        (rows[idx] ?? []).forEach((cell, columnIndex) => {
            const key = normalizeHeader(cell);

            if (key !== '') {
                map[key] = columnIndex;
            }
        });

        const hasSection = aliases.section.some(
            (alias) => map[normalizeHeader(alias)] !== undefined,
        );
        const hasSubjectCode = aliases.subject_code.some(
            (alias) => map[normalizeHeader(alias)] !== undefined,
        );

        if (hasSection && hasSubjectCode) {
            return { idx, map };
        }
    }

    return null;
}

function readField(
    row: unknown[],
    map: Record<string, number>,
    key: keyof typeof aliases,
): string {
    for (const alias of aliases[key]) {
        const column = map[normalizeHeader(alias)];

        if (column !== undefined) {
            return normalize(row[column]);
        }
    }

    return '';
}

async function parseLoadFile(file: File): Promise<PreviewData> {
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
            'Header row not found. Required columns: Section and Subject Code.',
        );
    }

    const parsedRows: PreviewRow[] = [];

    for (let rowIndex = header.idx + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? [];

        if (rowIsEmpty(row)) {
            continue;
        }

        const code = readField(row, header.map, 'code');
        const section = readField(row, header.map, 'section');
        let subjectCode = readField(row, header.map, 'subject_code');

        if (subjectCode === '' && code !== '') {
            subjectCode = code;
        }

        if (code === '' && section === '' && subjectCode === '') {
            continue;
        }

        parsedRows.push({
            row: rowIndex + 1,
            code,
            section,
            subject_code: subjectCode,
            subject_description: readField(
                row,
                header.map,
                'subject_description',
            ),
            units: readField(row, header.map, 'units'),
            load_units: readField(row, header.map, 'load_units'),
            lec_units: readField(row, header.map, 'lec_units'),
            lab_units: readField(row, header.map, 'lab_units'),
            hours: readField(row, header.map, 'hours'),
            schedule: readField(row, header.map, 'schedule'),
            room: readField(row, header.map, 'room'),
            size: readField(row, header.map, 'size'),
        });
    }

    return {
        fileName: file.name,
        headerRow: header.idx + 1,
        totalRows: parsedRows.length,
        previewRows: parsedRows.slice(0, PREVIEW_LIMIT),
        hasMoreRows: parsedRows.length > PREVIEW_LIMIT,
    };
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
            <Badge
                variant="outline"
                className="border-amber-500 text-amber-700"
            >
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
    facultyOptions,
    assignedFacultyIds,
    filters,
    importSummary,
}: Props) {
    const isInactive = !term.is_active;
    const [search, setSearch] = useState(filters.q || '');
    const [rowsPerPage, setRowsPerPage] = useState(
        String(filters.per_page ?? loads.per_page ?? 10),
    );
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [facultyPickerSearch, setFacultyPickerSearch] = useState('');
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [editingLoad, setEditingLoad] = useState<FacultyLoad | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const summaryRef = useRef('');

    const importForm = useForm<{
        faculty_id: string;
        file: File | null;
    }>({
        faculty_id: '',
        file: null,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Dashboard', href: adminRoutes.dashboard().url },
        { title: 'Terms', href: adminRoutes.terms.index().url },
        {
            title: `${term.period_code} Faculty Loads`,
            href: `/admin/terms/${term.id}/faculty-loads`,
        },
    ];

    const facultyById = useMemo(
        () =>
            new Map(
                facultyOptions.map((faculty) => [String(faculty.id), faculty]),
            ),
        [facultyOptions],
    );

    const selectedFaculty = useMemo(() => {
        if (importForm.data.faculty_id === '') {
            return null;
        }

        return facultyById.get(importForm.data.faculty_id) ?? null;
    }, [facultyById, importForm.data.faculty_id]);

    const selectedDepartmentLabel = selectedFaculty
        ? (selectedFaculty.department?.code ??
          selectedFaculty.department?.name ??
          'Unassigned')
        : '-';

    const assignedFacultyIdSet = useMemo(
        () => new Set(assignedFacultyIds.map((facultyId) => String(facultyId))),
        [assignedFacultyIds],
    );

    const filteredFacultyOptions = useMemo(() => {
        const query = facultyPickerSearch.trim().toLowerCase();
        const editingFacultyId = editingLoad?.faculty?.id
            ? String(editingLoad.faculty.id)
            : null;
        const availableFacultyOptions = facultyOptions.filter((faculty) => {
            const facultyId = String(faculty.id);

            if (editingFacultyId !== null && facultyId === editingFacultyId) {
                return true;
            }

            return !assignedFacultyIdSet.has(facultyId);
        });

        if (query === '') {
            return availableFacultyOptions.slice(0, 60);
        }

        return availableFacultyOptions
            .filter((faculty) => {
                const haystack =
                    `${faculty.faculty_code} ${faculty.full_name}`.toLowerCase();

                return haystack.includes(query);
            })
            .slice(0, 60);
    }, [
        assignedFacultyIdSet,
        editingLoad,
        facultyOptions,
        facultyPickerSearch,
    ]);

    const buildListParams = (page?: number) => ({
        q: search || undefined,
        per_page: Number(rowsPerPage),
        page,
    });

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                `/admin/terms/${term.id}/faculty-loads`,
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

    useEffect(() => {
        if (!importSummary) return;

        const key = JSON.stringify(importSummary);
        if (summaryRef.current === key) return;
        summaryRef.current = key;

        toast.success('Faculty load import saved', {
            description: `${importSummary.imported_rows} row(s) imported (${importSummary.action}).`,
        });

        if (importSummary.skipped_rows > 0) {
            toast.warning('Some rows were skipped', {
                description:
                    importSummary.issues.length > 0
                        ? importSummary.has_more_issues
                            ? `${importSummary.issues[0]} (and more)`
                            : importSummary.issues[0]
                        : `${importSummary.skipped_rows} row(s) skipped.`,
            });
        }
    }, [importSummary]);

    const resetImportState = () => {
        importForm.setData('file', null);
        setPreviewData(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFilePicker = () => {
        if (isInactive) {
            toast.error(
                'This term is inactive. Activate it before importing faculty loads.',
            );
            return;
        }

        if (importForm.processing || previewLoading) {
            return;
        }

        if (!importForm.data.faculty_id) {
            toast.error('Select a faculty first.');
            return;
        }

        fileInputRef.current?.click();
    };

    const onFacultyChange = (value: string) => {
        importForm.setData('faculty_id', value);
    };

    const openAddLoadDialog = () => {
        setEditingLoad(null);
        setFacultyPickerSearch('');
        importForm.setData('faculty_id', '');
        importForm.setData('file', null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setAddDialogOpen(true);
    };

    const openEditLoadDialog = (load: FacultyLoad) => {
        if (isInactive) {
            toast.error(
                'This term is inactive. Activate it before editing faculty loads.',
            );
            return;
        }

        if (!load.faculty?.id) {
            toast.error('This load is missing faculty information.');
            return;
        }

        setEditingLoad(load);
        importForm.setData('faculty_id', String(load.faculty.id));
        importForm.setData('file', null);
        setFacultyPickerSearch(
            `${load.faculty.faculty_code} ${load.faculty.full_name}`.trim(),
        );

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setAddDialogOpen(true);
    };

    const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        importForm.setData('file', file);
        setPreviewLoading(true);

        try {
            const preview = await parseLoadFile(file);
            setPreviewData(preview);
            setAddDialogOpen(false);
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

    const onAddDialogChange = (open: boolean) => {
        if (importForm.processing || previewLoading) {
            return;
        }

        setAddDialogOpen(open);

        if (!open) {
            setEditingLoad(null);
            setFacultyPickerSearch('');
            importForm.setData('faculty_id', '');
            importForm.setData('file', null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const onPreviewDialogChange = (open: boolean) => {
        if (importForm.processing) return;

        setPreviewOpen(open);

        if (!open) {
            resetImportState();
        }
    };

    const confirmImport = () => {
        if (!importForm.data.faculty_id) {
            toast.error('Select a faculty first.');
            return;
        }

        if (!importForm.data.file) {
            toast.error('Choose an XLSX file first.');
            return;
        }

        importForm.post(`/admin/terms/${term.id}/faculty-loads/import`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingLoad(null);
                setPreviewOpen(false);
                resetImportState();
            },
            onError: (errors) => {
                toast.error(
                    errors.file ??
                        'Import failed. Please check your file and try again.',
                );
            },
        });
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > loads.last_page || page === loads.current_page) {
            return;
        }

        router.get(
            `/admin/terms/${term.id}/faculty-loads`,
            buildListParams(page),
            {
                preserveState: true,
                replace: true,
                preserveScroll: true,
            },
        );
    };

    const paginationItems = buildPageItems(loads.current_page, loads.last_page);
    const showingFrom = loads.from ?? 0;
    const showingTo = loads.to ?? 0;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`${term.period_code} Faculty Loads`} />

            <Dialog open={previewOpen} onOpenChange={onPreviewDialogChange}>
                <DialogContent className="flex max-h-[90vh] max-w-[96vw] flex-col overflow-hidden p-0 md:max-w-6xl">
                    <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle>Review Faculty Load Import</DialogTitle>
                        <DialogDescription>
                            {previewData
                                ? `Faculty: ${selectedFaculty?.faculty_code ?? '-'} - ${selectedFaculty?.full_name ?? '-'}. Department: ${selectedDepartmentLabel}. File: ${previewData.fileName}. Header detected at row A${previewData.headerRow}.`
                                : 'Review parsed rows before saving this faculty load.'}
                        </DialogDescription>
                    </DialogHeader>

                    {previewData && (
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            <div className="space-y-4">
                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                    <p>
                                        Total rows detected:{' '}
                                        {previewData.totalRows}
                                    </p>
                                    <p>
                                        Showing {previewData.previewRows.length}{' '}
                                        row(s)
                                        {previewData.hasMoreRows
                                            ? ' (preview truncated).'
                                            : '.'}
                                    </p>
                                </div>

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
                                                        key={`${row.row}-${row.code}-${row.subject_code}-${row.section}`}
                                                        className="border-b transition-colors hover:bg-muted/50"
                                                    >
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.row}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.code || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.section || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.subject_code ||
                                                                '-'}
                                                        </td>
                                                        <td className="max-w-[18rem] truncate px-4 py-2 align-middle">
                                                            {row.subject_description ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.units || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.load_units ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.lec_units ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.lab_units ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.hours || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.schedule ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.room || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                                                            {row.size || '-'}
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
                                onClick={() => onPreviewDialogChange(false)}
                                disabled={importForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={confirmImport}
                                disabled={
                                    importForm.processing ||
                                    !previewData ||
                                    isInactive
                                }
                            >
                                {importForm.processing
                                    ? 'Saving...'
                                    : 'Confirm & Save'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={onAddDialogChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLoad
                                ? 'Edit Faculty Load'
                                : 'Add Faculty Load'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingLoad
                                ? 'Upload a replacement XLSX file for this faculty. The file is parsed first so you can review before saving.'
                                : 'Select a faculty, then choose an XLSX file. The file is parsed first so you can review before saving.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="faculty_search">
                                Faculty Search
                            </Label>
                            <Input
                                id="faculty_search"
                                placeholder="Search by code or name..."
                                value={facultyPickerSearch}
                                onChange={(event) =>
                                    setFacultyPickerSearch(event.target.value)
                                }
                                autoFocus
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded-md border">
                            {filteredFacultyOptions.length === 0 ? (
                                <p className="p-3 text-sm text-muted-foreground">
                                    No faculty found or assigned to this term.
                                </p>
                            ) : (
                                filteredFacultyOptions.map((faculty) => {
                                    const isSelected =
                                        importForm.data.faculty_id ===
                                        String(faculty.id);

                                    return (
                                        <button
                                            key={faculty.id}
                                            type="button"
                                            onClick={() =>
                                                onFacultyChange(
                                                    String(faculty.id),
                                                )
                                            }
                                            className={`w-full border-b px-3 py-2 text-left last:border-b-0 ${
                                                isSelected
                                                    ? 'bg-accent'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <p className="font-medium">
                                                {faculty.faculty_code} -{' '}
                                                {faculty.full_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Department:{' '}
                                                {faculty.department?.code ??
                                                    faculty.department?.name ??
                                                    'Unassigned'}
                                            </p>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                            <p>
                                Selected faculty:{' '}
                                {selectedFaculty
                                    ? `${selectedFaculty.faculty_code} - ${selectedFaculty.full_name}`
                                    : '-'}
                            </p>
                            <p>Department: {selectedDepartmentLabel}</p>
                            {selectedFaculty?.department_id === null && (
                                <p className="text-amber-700">
                                    This faculty has no department assigned.
                                    Import will save a null department.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
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
                            onClick={() => onAddDialogChange(false)}
                            disabled={importForm.processing || previewLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={openFilePicker}
                            disabled={
                                importForm.processing ||
                                previewLoading ||
                                isInactive
                            }
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {previewLoading
                                ? 'Parsing...'
                                : editingLoad
                                  ? 'Choose Replacement XLSX'
                                  : 'Choose XLSX'}
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
                                {term.period_code} faculty loads
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <TermStatusBadge isActive={term.is_active} />
                            <TermCompletionBadge
                                completed={term.completed_loads}
                                total={term.total_loads}
                            />
                            <Button
                                type="button"
                                onClick={openAddLoadDialog}
                                disabled={isInactive}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Faculty Load
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isInactive && (
                            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                This term is inactive. Activate it to import or
                                modify faculty loads.
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
                                            No faculty loads found for this
                                            term.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    loads.data.map((load) => (
                                        <TableRow key={load.id}>
                                            <TableCell className="font-mono">
                                                {load.faculty?.faculty_code ||
                                                    '-'}
                                            </TableCell>
                                            <TableCell>
                                                {load.faculty?.full_name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {load.department?.code ||
                                                    load.department?.name ||
                                                    '-'}
                                            </TableCell>
                                            <TableCell>
                                                {load.items_count}
                                            </TableCell>
                                            <TableCell>
                                                {submissionProgressBadge(load)}
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
                                                                `/admin/terms/${term.id}/faculty-loads/${load.id}`,
                                                            )
                                                        }
                                                    />
                                                    <InlineActionButton
                                                        icon={Pencil}
                                                        label="Edit"
                                                        disabled={
                                                            isInactive ||
                                                            !load.faculty?.id
                                                        }
                                                        onClick={() =>
                                                            openEditLoadDialog(
                                                                load,
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
        </AdminLayout>
    );
}
