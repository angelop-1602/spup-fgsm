import { Calendar, LayoutGrid } from 'lucide-react';
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
import deanRoutes from '@/routes/dean';
import type { AppLayoutProps, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: deanRoutes.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Terms Management',
        href: deanRoutes.terms.index(),
        icon: Calendar,
    },
];

export default function DeanLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <a href={deanRoutes.dashboard().url}>
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
