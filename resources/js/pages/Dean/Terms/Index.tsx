import { Head, router } from '@inertiajs/react';
import { ChevronDown, Eye, Search } from 'lucide-react';
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
    TermStatusBadge,
} from '@/components/term-state';
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
import DeanLayout from '@/layouts/DeanLayout';
import deanRoutes from '@/routes/dean';
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
        title: 'Dean Dashboard',
        href: deanRoutes.dashboard().url,
    },
    {
        title: 'Terms',
        href: deanRoutes.terms.index().url,
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
                deanRoutes.terms.index().url,
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

    const renderTermsTable = (termRows: TermIndexTerm[]) => (
        <TermIndexTable
            terms={termRows}
            emptyMessage="No terms found."
            renderStatusCell={(term) => (
                <TermStatusBadge isActive={term.is_active} />
            )}
            renderCompletionCell={(term) => (
                <TermCompletionBadge
                    completed={term.completed_loads}
                    total={term.total_loads}
                />
            )}
            renderActionsCell={(term) => (
                <InlineActions>
                    <InlineActionButton
                        icon={Eye}
                        label="View"
                        onClick={() =>
                            router.visit(
                                deanRoutes.terms.facultyLoads.show({
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
        </DeanLayout>
    );
}
