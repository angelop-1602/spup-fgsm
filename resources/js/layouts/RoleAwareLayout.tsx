import { usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import AppLayout from '@/layouts/app-layout';
import DeanLayout from '@/layouts/DeanLayout';
import StaffLayout from '@/layouts/StaffLayout';
import type { AppLayoutProps, SharedData } from '@/types';

export default function RoleAwareLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    if (user?.roles?.includes('ADMIN')) {
        return (
            <AdminLayout breadcrumbs={breadcrumbs}>
                {children}
            </AdminLayout>
        );
    }

    if (user?.roles?.includes('REGISTRAR_STAFF')) {
        return (
            <StaffLayout breadcrumbs={breadcrumbs}>
                {children}
            </StaffLayout>
        );
    }

    if (user?.roles?.includes('DEAN')) {
        return (
            <DeanLayout breadcrumbs={breadcrumbs}>
                {children}
            </DeanLayout>
        );
    }

    // Fallback to AppLayout for users without specific roles
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {children}
        </AppLayout>
    );
}
