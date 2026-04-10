import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Term = {
    id: number;
    academic_year: string;
    term_name: string;
    is_completed: boolean;
    admin_override_unlocked: boolean;
};

type Props = {
    term: Term;
    autoLockEnabled: boolean;
};

export default function TermsEdit({ term, autoLockEnabled }: Props) {
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
            title: 'Edit Term',
            href: adminRoutes.terms.edit({ term: term.id }).url,
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        academic_year: term.academic_year,
        term_name: term.term_name,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(adminRoutes.terms.update({ term: term.id }).url);
    };

    const canEdit =
        !autoLockEnabled || !term.is_completed || term.admin_override_unlocked;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Term" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Term</CardTitle>
                        <CardDescription>
                            {!canEdit && (
                                <span className="text-destructive">
                                    This term is locked. Unlock it to edit.
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="academic_year">Academic Year</Label>
                                <Input
                                    id="academic_year"
                                    value={data.academic_year}
                                    onChange={(e) => setData('academic_year', e.target.value)}
                                    required
                                    disabled={!canEdit}
                                />
                                {errors.academic_year && (
                                    <p className="text-sm text-destructive mt-1">{errors.academic_year}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="term_name">Term Name</Label>
                                <Input
                                    id="term_name"
                                    value={data.term_name}
                                    onChange={(e) => setData('term_name', e.target.value)}
                                    required
                                    disabled={!canEdit}
                                />
                                {errors.term_name && (
                                    <p className="text-sm text-destructive mt-1">{errors.term_name}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing || !canEdit}>
                                    Update Term
                                </Button>
                                <Link href={adminRoutes.terms.index().url}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
