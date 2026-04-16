import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, Eye, Pencil, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem, PaginatedResponse } from '@/types';

type ListingMode = 'grouped' | 'flat';

type Props = {
    listing_mode: ListingMode;
    grouped_terms: PaginatedResponse<TermIndexGroup> | null;
    terms: PaginatedResponse<TermIndexTerm> | null;
    latest_academic_year: string | null;
    filters: {
        q?: string | null;
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

export default function TermsIndex({
    listing_mode,
    grouped_terms,
    terms,
    latest_academic_year,
    filters,
}: Props) {
    const currentSearch = filters.q ?? '';
    const [search, setSearch] = useState(currentSearch);
    const [updatingTermId, setUpdatingTermId] = useState<number | null>(null);
    const [openAcademicYears, setOpenAcademicYears] = useState<
        Record<string, boolean>
    >({});

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
                adminRoutes.terms.index().url,
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

    const updateTermStatus = (
        termId: number,
        status: 'ACTIVE' | 'INACTIVE',
    ) => {
        setUpdatingTermId(termId);

        router.patch(
            adminRoutes.terms.status(
                { term: termId },
                {
                    query: {
                        q: search.trim() || undefined,
                        page: pagination?.current_page,
                    },
                },
            ).url,
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

    const renderTermsTable = (termRows: TermIndexTerm[]) => (
        <TermIndexTable
            terms={termRows}
            emptyMessage="No terms found."
            renderStatusCell={(term) => (
                <select
                    value={term.is_active ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(event) =>
                        updateTermStatus(
                            term.id,
                            event.target.value as 'ACTIVE' | 'INACTIVE',
                        )
                    }
                    disabled={updatingTermId === term.id}
                    aria-label={`Update term status for ${term.period_code}`}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
            )}
            renderCompletionCell={(term) => (
                <div
                    className="w-fit"
                    aria-label={`Completion ${termCompletionLabel(term.completed_loads, term.total_loads)}`}
                >
                    <TermCompletionBadge
                        completed={term.completed_loads}
                        total={term.total_loads}
                    />
                </div>
            )}
            renderActionsCell={(term) => (
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
                                adminRoutes.terms.edit({
                                    term: term.id,
                                }).url,
                            )
                        }
                    />
                </InlineActions>
            )}
        />
    );

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
                            <Button asChild>
                                <Link
                                    href={adminRoutes.terms.createBatch.form().url}
                                >
                                    Create Terms
                                </Link>
                            </Button>
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
        </AdminLayout>
    );
}
