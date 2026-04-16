import { Head, Link, router } from '@inertiajs/react';
import { Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    InlineActionButton,
    InlineActions,
} from '@/components/inline-actions';
import {
    TermCompletionBadge,
    TermStatusBadge,
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
import DeanLayout from '@/layouts/DeanLayout';
import deanRoutes from '@/routes/dean';
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
        title: 'Dean Dashboard',
        href: deanRoutes.dashboard().url,
    },
    {
        title: 'Terms',
        href: deanRoutes.terms.index().url,
    },
];

export default function TermsIndex({ terms, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(
                deanRoutes.terms.index().url,
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

    return (
        <DeanLayout breadcrumbs={breadcrumbs}>
            <Head title="Terms" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Terms</CardTitle>
                        <CardDescription>
                            View terms and faculty loads for your department.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 max-w-sm">
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                </span>
                                <Input
                                    type="text"
                                    placeholder="Search by code, term, or AY..."
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
                                    <TableRow>
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
                                            <TableCell className="text-left">
                                                {term.period_code}
                                            </TableCell>
                                            <TableCell>{term.term_name}</TableCell>
                                            <TableCell>
                                                {term.academic_year}
                                            </TableCell>
                                            <TableCell>
                                                <TermStatusBadge
                                                    isActive={term.is_active}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TermCompletionBadge
                                                    completed={
                                                        term.completed_loads
                                                    }
                                                    total={term.total_loads}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <InlineActions>
                                                    <InlineActionButton
                                                        icon={Eye}
                                                        label="View"
                                                        onClick={() =>
                                                            router.visit(
                                                                deanRoutes.terms.facultyLoads.show(
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
        </DeanLayout>
    );
}
