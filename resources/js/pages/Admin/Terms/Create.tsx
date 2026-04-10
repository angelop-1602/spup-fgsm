import { Head, useForm, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type GeneratedTerm = {
    school_unit: string;
    year_start: number;
    year_end: number;
    academic_year: string;
    term_name: string;
    period_code: string;
    display_code: string | null;
    is_active: boolean;
};

type Props = {
    terms: GeneratedTerm[];
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
    {
        title: 'Create Terms',
        href: adminRoutes.terms.createBatch.form().url,
    },
];

export default function CreateTerms({ terms }: Props) {
    const previewForm = useForm({
        year_start: new Date().getFullYear(),
        year_end: new Date().getFullYear() + 1,
    });

    const commitForm = useForm<{ terms: GeneratedTerm[] }>({
        terms: terms ?? [],
    });

    useEffect(() => {
        commitForm.setData('terms', terms ?? []);
    }, [terms]);

    const updateTermField = (index: number, field: keyof GeneratedTerm, value: string) => {
        const next = [...commitForm.data.terms];
        const current = next[index];
        if (!current) {
            return;
        }

        next[index] = {
            ...current,
            [field]: value,
        };

        commitForm.setData('terms', next);
    };

    const handlePreviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        previewForm.post(adminRoutes.terms.createBatch.preview().url);
    };

    const handleCommitSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        commitForm.post(adminRoutes.terms.createBatch.store().url);
    };

    const handleClearPreview = () => {
        // Clear preview on the backend session and then locally
        router.post('/admin/terms/create-batch/reset', {}, {
            preserveScroll: true,
            onSuccess: () => {
                commitForm.setData('terms', []);
            },
        });
    };

    const hasPreview = commitForm.data.terms && commitForm.data.terms.length > 0;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Terms" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Create Terms</CardTitle>
                        <CardDescription>
                            Create academic terms using the official SPUP AY coding. Existing terms will not be
                            duplicated.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handlePreviewSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="year_start">Year Start</Label>
                                    <Input
                                        id="year_start"
                                        type="number"
                                        value={previewForm.data.year_start}
                                        onChange={(e) => previewForm.setData('year_start', Number(e.target.value))}
                                    />
                                    {previewForm.errors.year_start && (
                                        <p className="mt-1 text-sm text-destructive">{previewForm.errors.year_start}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="year_end">Year End</Label>
                                    <Input
                                        id="year_end"
                                        type="number"
                                        value={previewForm.data.year_end}
                                        onChange={(e) => previewForm.setData('year_end', Number(e.target.value))}
                                    />
                                    {previewForm.errors.year_end && (
                                        <p className="mt-1 text-sm text-destructive">{previewForm.errors.year_end}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end flex-col">
                                <Button type="submit" disabled={previewForm.processing} >
                                    Preview Terms
                                </Button>

                            </div>
                        </form>

                        {hasPreview && (
                            <form onSubmit={handleCommitSubmit} className="space-y-6">
                                <div className="flex items-center justify-between">
                                
                                </div>

                                {Object.entries(
                                    commitForm.data.terms.reduce<
                                        Record<string, { term: GeneratedTerm; index: number }[]>
                                    >((acc, term, index) => {
                                        const unit = term.school_unit;
                                        if (!acc[unit]) {
                                            acc[unit] = [];
                                        }
                                        acc[unit].push({ term, index });
                                        return acc;
                                    }, {}),
                                ).map(([unit, unitTerms]) => {
                                    const headerLabel = unit === 'GRADUATE' ? 'Graduate School' : 'College';
                                    const ay = unitTerms[0]?.term.academic_year ?? '';

                                    return (
                                        <div key={unit} className="space-y-2">
                                            <div>
                                                <p className="text-sm font-semibold">{headerLabel}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Code for the Period (AY {ay})
                                                </p>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/3">Code</TableHead>
                                                        <TableHead className="w-1/3">Term</TableHead>
                                                        <TableHead className="w-1/3">Display</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {unitTerms.map(({ term, index }) => (
                                                        <TableRow
                                                            key={`${term.school_unit}-${term.period_code}-${index}`}
                                                        >
                                                            <TableCell>
                                                                <Input
                                                                    value={term.period_code}
                                                                    onChange={(e) =>
                                                                        updateTermField(
                                                                            index,
                                                                            'period_code',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    value={term.term_name}
                                                                    onChange={(e) =>
                                                                        updateTermField(
                                                                            index,
                                                                            'term_name',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    value={term.display_code ?? ''}
                                                                    onChange={(e) =>
                                                                        updateTermField(
                                                                            index,
                                                                            'display_code',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClearPreview}
                                        disabled={commitForm.processing}
                                    >
                                        Clear Preview
                                    </Button>
                                    <Button type="submit" disabled={commitForm.processing}>
                                        Save Terms
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

