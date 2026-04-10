import { Calendar, LayoutGrid, BarChart3 } from 'lucide-react';
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
import staffRoutes from '@/routes/staff';
import type { AppLayoutProps, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: staffRoutes.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Terms Management',
        href: staffRoutes.terms.index(),
        icon: Calendar,
    },
    {
        title: 'Reports / Exports',
        href: staffRoutes.reports.index(),
        icon: BarChart3,
    },
];

export default function StaffLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <a href={staffRoutes.dashboard().url}>
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
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}

