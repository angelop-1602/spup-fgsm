import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Department = {
    id: number;
    name: string;
    code: string | null;
};

type Props = {
    department: Department;
};

export default function DepartmentsEdit({ department }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Admin Dashboard',
            href: adminRoutes.dashboard().url,
        },
        {
            title: 'Departments',
            href: adminRoutes.departments.index().url,
        },
        {
            title: 'Edit Department',
            href: adminRoutes.departments.edit({ department: department.id }).url,
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        name: department.name,
        code: department.code || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(adminRoutes.departments.update({ department: department.id }).url);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Department" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Department</CardTitle>
                        <CardDescription>Update department information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="code">Code (optional)</Label>
                                <Input
                                    id="code"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive mt-1">{errors.code}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    Update Department
                                </Button>
                                <Link href={adminRoutes.departments.index().url}>
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
