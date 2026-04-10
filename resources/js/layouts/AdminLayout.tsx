import {
    Calendar,
    LayoutGrid,
    BarChart3,
    FileClock,
    GraduationCap,
    ShieldCheck,
    UserCog,
} from 'lucide-react';
import { AppContent } from '@/components/app-content';
import AppLogo from '@/components/app-logo';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import adminRoutes from '@/routes/admin';
import type { AppLayoutProps, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: adminRoutes.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Term Management',
        href: adminRoutes.terms.index(),
        icon: Calendar,
    },
    {
        title: 'Clearance',
        href: adminRoutes.clearance.index(),
        icon: ShieldCheck,
    },
    {
        title: 'Faculty Masterlist',
        href: adminRoutes.faculty.index(), // /admin/faculty
        icon: LayoutGrid,
    },
    {
        title: 'Registrar Staff',
        href: adminRoutes.users.index({
            // /admin/users?q=&role=REGISTRAR_STAFF (later)
            // you can start with just adminRoutes.users.index() and add filters in the page
        }),
        icon: UserCog,
    },
    {
        title: 'Deans',
        href: adminRoutes.deans.index(),
        icon: GraduationCap,
    },
    {
        title: 'Reports / Exports',
        href: adminRoutes.reports.index(), // /admin/reports
        icon: BarChart3,
    },
    {
        title: 'Audit Logs',
        href: adminRoutes.auditLogs.index(), // /admin/audit-logs
        icon: FileClock,
    },
];

export default function AdminLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <a href={adminRoutes.dashboard().url}>
                                    <AppLogo />
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <NavMain items={mainNavItems} />
                </SidebarContent>
                <SidebarFooter>
                    <NavFooter className="mt-auto" items={[]} />
                    <NavUser />
                </SidebarFooter>
            </Sidebar>
            <AppContent variant="sidebar" className="overflow-x-auto">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
