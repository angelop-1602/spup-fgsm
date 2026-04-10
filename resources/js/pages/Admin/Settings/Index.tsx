import { Head, Link } from '@inertiajs/react';
import { Settings2, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/layouts/AdminLayout';
import adminRoutes from '@/routes/admin';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Settings',
        href: adminRoutes.settings.index().url,
    },
];

export default function AdminSettings() {
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Settings" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>System Settings</CardTitle>
                        <CardDescription>
                            Manage system-wide settings and configurations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">System Configuration</p>
                                            <p className="text-sm text-muted-foreground">
                                                Configure system-wide settings and preferences
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" disabled>
                                        Coming Soon
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                        <CardDescription>
                            Manage your personal account settings and preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">Profile Settings</p>
                                            <p className="text-sm text-muted-foreground">
                                                Update your profile information, password, and security settings
                                            </p>
                                        </div>
                                    </div>
                                    <Link href={edit().url}>
                                        <Button variant="outline">
                                            <Settings2 className="mr-2 h-4 w-4" />
                                            Go to Profile Settings
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
