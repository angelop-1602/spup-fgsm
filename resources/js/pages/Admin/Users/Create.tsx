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

type Props = {
    departments: Department[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Registrar Staff',
        href: adminRoutes.users.index({}).url,
    },
    {
        title: 'Add Staff',
        href: adminRoutes.users.create().url,
    },
];

export default function CreateUser({ departments }: Props) {
    const form = useForm({
        name: '',
        email: '',
        department_id: '' as string | '',
        role: 'REGISTRAR_STAFF' as const,
    });

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(adminRoutes.users.store().url);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Registrar Staff" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Add Registrar Staff</CardTitle>
                        <CardDescription>
                            Create a new registrar staff account. The default password will be Spup@12345.
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
                                <Label htmlFor="department_id">Assigned department</Label>
                                <Select
                                    value={form.data.department_id}
                                    onValueChange={(value) => form.setData('department_id', value)}
                                >
                                    <SelectTrigger id="department_id">
                                        <SelectValue placeholder="Select a department (optional)" />
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
                                    Save
                                </Button>
                            </div>

                            <p className="pt-2 text-xs text-muted-foreground">
                                Note: The initial password for this account will be Spup@12345. Ask the staff to
                                change it after first login.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

