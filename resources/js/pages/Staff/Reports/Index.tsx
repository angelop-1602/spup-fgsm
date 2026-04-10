import ReportsExportView from '@/components/reports/ReportsExportView';
import type { ReportPageProps } from '@/components/reports/types';
import StaffLayout from '@/layouts/StaffLayout';
import staffRoutes from '@/routes/staff';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Staff Dashboard',
        href: staffRoutes.dashboard().url,
    },
    {
        title: 'Reports / Exports',
        href: staffRoutes.reports.index().url,
    },
];

export default function StaffReportsIndex({
    ...props
}: ReportPageProps) {
    return (
        <StaffLayout breadcrumbs={breadcrumbs}>
            <ReportsExportView
                {...props}
                indexUrl={staffRoutes.reports.index().url}
                exportUrl={staffRoutes.reports.export().url}
                buildTermPdfUrl={(termId) =>
                    staffRoutes.reports.exportPdf({ term: termId }).url
                }
                buildFacultyPdfUrl={(facultyId) =>
                    staffRoutes.reports.facultyExportPdf({ faculty: facultyId })
                        .url
                }
            />
        </StaffLayout>
    );
}
