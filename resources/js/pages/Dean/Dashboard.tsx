import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DeanLayout from '@/layouts/DeanLayout';
import deanRoutes from '@/routes/dean';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dean Dashboard',
        href: deanRoutes.dashboard().url,
    },
];

type Props = {
    department: { id: number; name: string } | null;
    stats: {
        totalFacultyCount: number;
        loadsSubmitted: number;
        loadsPendingRevision: number;
    };
};

export default function DeanDashboard({ department, stats }: Props) {

    return (
        <DeanLayout breadcrumbs={breadcrumbs}>
            <Head title="Dean Dashboard" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{department?.name ?? 'Dean'}</CardTitle>
                        <CardDescription>
                            Departmental compliance overview for your assigned department.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Total faculty in department</p>
                                <p className="text-2xl font-semibold">{stats.totalFacultyCount}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Loads submitted</p>
                                <p className="text-2xl font-semibold">{stats.loadsSubmitted}</p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">Loads pending / revision</p>
                                <p className="text-2xl font-semibold">{stats.loadsPendingRevision}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DeanLayout>
    );
}

