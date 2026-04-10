import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type Department = {
    id: number;
    name: string;
    code: string | null;
};

type Props = {
    departments: PaginatedResponse<Department>;
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
        title: 'Departments',
        href: adminRoutes.departments.index().url,
    },
];

export default function DepartmentsIndex({ departments, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(adminRoutes.departments.index().url, { q: search || undefined }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this department?')) {
            router.delete(adminRoutes.departments.destroy({ department: id }).url);
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Departments" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Departments</CardTitle>
                                <CardDescription>Manage departments</CardDescription>
                            </div>
                            <Link href={adminRoutes.departments.create().url}>
                                <Button>Create Department</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="mb-4">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Search departments..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button type="submit" variant="outline">
                                    Search
                                </Button>
                            </div>
                        </form>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No departments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    departments.data.map((department) => (
                                        <TableRow key={department.id}>
                                            <TableCell>{department.name}</TableCell>
                                            <TableCell>{department.code || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Link href={adminRoutes.departments.edit({ department: department.id }).url}>
                                                        <Button variant="ghost" size="sm">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(department.id)}
                                                        className="text-destructive"
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {departments.links && departments.links.length > 3 && (
                            <div className="mt-4 flex justify-center gap-2">
                                {departments.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 rounded border ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
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
