import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
        title: 'Faculty Masterlist',
        href: adminRoutes.faculty.index().url,
    },
    {
        title: 'Add Faculty',
        href: adminRoutes.faculty.create().url,
    },
];

export default function CreateFaculty({ departments }: Props) {
    const form = useForm({
        faculty_code: '',
        full_name: '',
        middle_name: '',
        call_name: '',
        contact_no: '',
        email: '',
        emp_type: '',
        emp_status: '',
        supervisor: '',
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
        department_id: '',
    });

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(adminRoutes.faculty.store().url);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Faculty" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Faculty</CardTitle>
                        <CardDescription>
                            Create a faculty record using the same XLSX header
                            fields.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="faculty_code">Code</Label>
                                    <Input
                                        id="faculty_code"
                                        value={form.data.faculty_code}
                                        onChange={(e) =>
                                            form.setData(
                                                'faculty_code',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.faculty_code && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.faculty_code}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Name</Label>
                                    <Input
                                        id="full_name"
                                        value={form.data.full_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'full_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.full_name && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.full_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="middle_name">
                                        Middle Name
                                    </Label>
                                    <Input
                                        id="middle_name"
                                        value={form.data.middle_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'middle_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.middle_name && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.middle_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="call_name">Call Name</Label>
                                    <Input
                                        id="call_name"
                                        value={form.data.call_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'call_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.call_name && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.call_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_no">
                                        Contact No
                                    </Label>
                                    <Input
                                        id="contact_no"
                                        value={form.data.contact_no}
                                        onChange={(e) =>
                                            form.setData(
                                                'contact_no',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.contact_no && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.contact_no}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                'email',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.email && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emp_type">Emp Type</Label>
                                    <Input
                                        id="emp_type"
                                        value={form.data.emp_type}
                                        onChange={(e) =>
                                            form.setData(
                                                'emp_type',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.emp_type && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.emp_type}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emp_status">
                                        Emp Status
                                    </Label>
                                    <Input
                                        id="emp_status"
                                        value={form.data.emp_status}
                                        onChange={(e) =>
                                            form.setData(
                                                'emp_status',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.emp_status && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.emp_status}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="supervisor">
                                        Supervisor
                                    </Label>
                                    <Input
                                        id="supervisor"
                                        value={form.data.supervisor}
                                        onChange={(e) =>
                                            form.setData(
                                                'supervisor',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.supervisor && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.supervisor}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="department_id">Dept</Label>
                                    <Select
                                        value={
                                            form.data.department_id === ''
                                                ? 'none'
                                                : form.data.department_id
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'department_id',
                                                value === 'none' ? '' : value,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="department_id">
                                            <SelectValue placeholder="Select a department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                No Department
                                            </SelectItem>
                                            {departments.map((dept) => (
                                                <SelectItem
                                                    key={dept.id}
                                                    value={String(dept.id)}
                                                >
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.department_id && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.department_id}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'status',
                                                value as 'ACTIVE' | 'INACTIVE',
                                            )
                                        }
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">
                                                Active
                                            </SelectItem>
                                            <SelectItem value="INACTIVE">
                                                Inactive
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.status && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.status}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                    disabled={form.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    Save
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
