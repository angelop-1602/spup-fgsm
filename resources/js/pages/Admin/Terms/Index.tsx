import { Head, Link, router } from '@inertiajs/react';
import { Eye, Pencil, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
import {
    TermCompletionBadge,
    termCompletionLabel,
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

type Props = {
    terms: PaginatedResponse<Term>;
    filters: {
        q?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Terms',
        href: adminRoutes.terms.index().url,
    },
];

export default function TermsIndex({ terms, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [updatingTermId, setUpdatingTermId] = useState<number | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                adminRoutes.terms.index().url,
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

    const updateTermStatus = (
        termId: number,
        status: 'ACTIVE' | 'INACTIVE',
    ) => {
        setUpdatingTermId(termId);

        router.patch(
            `/admin/terms/${termId}/status`,
            { status },
            {
                preserveScroll: true,
                onFinish: () => {
                    setUpdatingTermId((current) =>
                        current === termId ? null : current,
                    );
                },
            },
        );
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Terms" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Terms</CardTitle>
                                <CardDescription>
                                    Manage academic terms
                                </CardDescription>
                            </div>
                            <Link
                                href={adminRoutes.terms.createBatch.form().url}
                            >
                                <Button>Create Terms</Button>
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
                                    <TableHead>Completion</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terms.data.length === 0 ? (
                                    <TableRow className="py-0">
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground"
                                        >
                                            No terms found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    terms.data.map((term) => (
                                        <TableRow key={term.id}>
                                            <TableCell className="py-0 text-left">
                                                {term.period_code}
                                            </TableCell>
                                            <TableCell className="py-0">
                                                {term.term_name}
                                            </TableCell>
                                            <TableCell className="py-0">
                                                {term.academic_year}
                                            </TableCell>
                                            <TableCell>
                                                <select
                                                    value={
                                                        term.is_active
                                                            ? 'ACTIVE'
                                                            : 'INACTIVE'
                                                    }
                                                    onChange={(event) =>
                                                        updateTermStatus(
                                                            term.id,
                                                            event.target
                                                                .value as
                                                                | 'ACTIVE'
                                                                | 'INACTIVE',
                                                        )
                                                    }
                                                    disabled={
                                                        updatingTermId ===
                                                        term.id
                                                    }
                                                    aria-label={`Update term status for ${term.period_code}`}
                                                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                >
                                                    <option value="ACTIVE">
                                                        Active
                                                    </option>
                                                    <option value="INACTIVE">
                                                        Inactive
                                                    </option>
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="w-fit"
                                                    aria-label={`Completion ${termCompletionLabel(term.completed_loads, term.total_loads)}`}
                                                >
                                                    <TermCompletionBadge
                                                        completed={
                                                            term.completed_loads
                                                        }
                                                        total={term.total_loads}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-0">
                                                <InlineActions>
                                                    <InlineActionButton
                                                        icon={Eye}
                                                        label="View"
                                                        onClick={() =>
                                                            router.visit(
                                                                `/admin/terms/${term.id}/faculty-loads`,
                                                            )
                                                        }
                                                    />
                                                    <InlineActionButton
                                                        icon={Pencil}
                                                        label="Edit"
                                                        onClick={() =>
                                                            router.visit(
                                                                adminRoutes.terms.edit(
                                                                    {
                                                                        term: term.id,
                                                                    },
                                                                ).url,
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

                        {terms.links && terms.links.length > 3 && (
                            <div className="mt-4 flex justify-center gap-2">
                                {terms.links.map((link, index) => (
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
        </AdminLayout>
    );
}
