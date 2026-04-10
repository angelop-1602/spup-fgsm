import ReportsExportView from '@/components/reports/ReportsExportView';
import type { ReportPageProps } from '@/components/reports/types';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Reports / Exports',
        href: adminRoutes.reports.index().url,
    },
];

export default function ReportsIndex({
    ...props
}: ReportPageProps) {
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <ReportsExportView
                {...props}
                indexUrl={adminRoutes.reports.index().url}
                exportUrl={adminRoutes.reports.export().url}
                buildTermPdfUrl={(termId) =>
                    adminRoutes.reports.exportPdf({ term: termId }).url
                }
                buildFacultyPdfUrl={(facultyId) =>
                    adminRoutes.reports.facultyExportPdf({ faculty: facultyId })
                        .url
                }
            />
        </AdminLayout>
    );
}
