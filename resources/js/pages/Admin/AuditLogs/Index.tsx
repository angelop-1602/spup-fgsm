import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    academic_year: string;
    term_name: string;
    period_code: string;
};

type Department = {
    id: number;
    name: string;
};

type Faculty = {
    id: number;
    faculty_code: string;
    full_name: string;
};

type User = {
    id: number;
    name: string;
    email: string;
};

type FacultyLoad = {
    id: number;
    term: Term | null;
    faculty: Faculty | null;
    department: Department | null;
};

type AuditLog = {
    id: number;
    action: string;
    old_status: string | null;
    new_status: string | null;
    notes: string | null;
    created_at: string;
    faculty_load: FacultyLoad;
    actor: User | null;
};

type Props = {
    logs: PaginatedResponse<AuditLog>;
    terms: Term[];
    departments: Department[];
    faculty: Faculty[];
    actors: User[];
    filters: {
        term_id?: number;
        department_id?: number;
        faculty_id?: number;
        actor_user_id?: number;
        date_from?: string;
        date_to?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Audit Logs',
        href: adminRoutes.auditLogs.index().url,
    },
];

export default function AuditLogsIndex({
    logs,
    terms,
    departments,
    faculty,
    actors,
    filters,
}: Props) {
    const [localFilters, setLocalFilters] = useState({
        term_id: filters.term_id ? String(filters.term_id) : '',
        department_id: filters.department_id ? String(filters.department_id) : '',
        faculty_id: filters.faculty_id ? String(filters.faculty_id) : '',
        actor_user_id: filters.actor_user_id ? String(filters.actor_user_id) : '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const applyFilters = () => {
        const params: Record<string, string | number> = {};
        if (localFilters.term_id && localFilters.term_id !== '') {
            params.term_id = Number(localFilters.term_id);
        }
        if (localFilters.department_id && localFilters.department_id !== '') {
            params.department_id = Number(localFilters.department_id);
        }
        if (localFilters.faculty_id && localFilters.faculty_id !== '') {
            params.faculty_id = Number(localFilters.faculty_id);
        }
        if (localFilters.actor_user_id && localFilters.actor_user_id !== '') {
            params.actor_user_id = Number(localFilters.actor_user_id);
        }
        if (localFilters.date_from) {
            params.date_from = localFilters.date_from;
        }
        if (localFilters.date_to) {
            params.date_to = localFilters.date_to;
        }

        router.get(adminRoutes.auditLogs.index().url, params, {
            preserveState: true,
            replace: true,
        });
    };

    const formatAction = (action: string): string => {
        return action
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Audit Logs</CardTitle>
                        <CardDescription>
                            View audit trail of faculty load status changes and actions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="term_id">Term</Label>
                                <Select
                                    value={localFilters.term_id}
                                    onValueChange={(value) =>
                                        setLocalFilters({ ...localFilters, term_id: value })
                                    }
                                >
                                    <SelectTrigger id="term_id">
                                        <SelectValue placeholder="All terms" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {terms.map((term) => (
                                            <SelectItem key={term.id} value={String(term.id)}>
                                                {term.period_code} - {term.academic_year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department_id">Department</Label>
                                <Select
                                    value={localFilters.department_id}
                                    onValueChange={(value) =>
                                        setLocalFilters({ ...localFilters, department_id: value })
                                    }
                                >
                                    <SelectTrigger id="department_id">
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
                                <Label htmlFor="faculty_id">Faculty</Label>
                                <Select
                                    value={localFilters.faculty_id}
                                    onValueChange={(value) =>
                                        setLocalFilters({ ...localFilters, faculty_id: value })
                                    }
                                >
                                    <SelectTrigger id="faculty_id">
                                        <SelectValue placeholder="All faculty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {faculty.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>
                                                {f.faculty_code} - {f.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="actor_user_id">Staff</Label>
                                <Select
                                    value={localFilters.actor_user_id}
                                    onValueChange={(value) =>
                                        setLocalFilters({ ...localFilters, actor_user_id: value })
                                    }
                                >
                                    <SelectTrigger id="actor_user_id">
                                        <SelectValue placeholder="All actors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actors.map((actor) => (
                                            <SelectItem key={actor.id} value={String(actor.id)}>
                                                {actor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_from">Date From</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={localFilters.date_from}
                                    onChange={(e) =>
                                        setLocalFilters({ ...localFilters, date_from: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_to">Date To</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={localFilters.date_to}
                                    onChange={(e) =>
                                        setLocalFilters({ ...localFilters, date_to: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <Button onClick={applyFilters}>Apply Filters</Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date/Time</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Faculty</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Status Change</TableHead>
                                    <TableHead>Staff</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No audit logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.data.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {new Date(log.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{formatAction(log.action)}</TableCell>
                                            <TableCell>
                                                {log.faculty_load.term
                                                    ? `${log.faculty_load.term.period_code} (${log.faculty_load.term.academic_year})`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.faculty_load.faculty
                                                    ? `${log.faculty_load.faculty.faculty_code} - ${log.faculty_load.faculty.full_name}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.faculty_load.department?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.old_status && log.new_status ? (
                                                    <span>
                                                        {log.old_status} -&gt; {log.new_status}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>{log.actor?.name || '-'}</TableCell>
                                            <TableCell className="max-w-md whitespace-normal break-words text-xs">
                                                {log.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {logs.links && logs.links.length > 3 && (
                            <div className="mt-4 flex justify-center gap-2">
                                {logs.links.map((link, index) => (
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
        </AdminLayout>
    );
}

