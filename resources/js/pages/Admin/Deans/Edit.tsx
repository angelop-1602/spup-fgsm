import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
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
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Department = {
    id: number;
    name: string;
};

type User = {
    id: number;
    name: string;
    email: string;
    department_id: number | null;
    department: Department | null;
};

type Props = {
    user: User;
    departments: Department[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Deans',
        href: adminRoutes.deans.index().url,
    },
    {
        title: 'Edit Dean',
        href: '#',
    },
];

export default function EditDean({ user, departments }: Props) {
    const form = useForm({
        name: user.name,
        email: user.email,
        department_id: user.department_id ? String(user.department_id) : '',
        role: 'DEAN' as const,
    });

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(adminRoutes.deans.update({ dean: user.id }).url);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Dean" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Edit Dean</CardTitle>
                        <CardDescription>
                            Update dean account information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-destructive">{form.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                                {form.errors.email && (
                                    <p className="text-sm text-destructive">{form.errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department_id">Department *</Label>
                                <Select
                                    value={form.data.department_id}
                                    onValueChange={(value) => form.setData('department_id', value)}
                                >
                                    <SelectTrigger id="department_id">
                                        <SelectValue placeholder="Select a department (required)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={String(dept.id)}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.department_id && (
                                    <p className="text-sm text-destructive">{form.errors.department_id}</p>
                                )}
                            </div>

                            {/* Hidden fixed role */}
                            <input type="hidden" name="role" value={form.data.role} />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                    disabled={form.processing}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Update
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
