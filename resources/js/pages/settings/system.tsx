import { Head, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import RoleAwareLayout from '@/layouts/RoleAwareLayout';
import SettingsLayout from '@/layouts/settings/layout';
import systemRoutes, { index as systemSettings } from '@/routes/system';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'System Settings',
        href: systemSettings().url,
    },
];

type DeanAccount = {
    department: string;
    email: string;
    default_password: string;
};

type Props = {
    deanAccounts: DeanAccount[];
    registrarName?: string | null;
    successMessage?: string | null;
};

export default function SystemSettings({
    deanAccounts,
    registrarName,
    successMessage,
}: Props) {
    const form = useForm({});
    const registrarForm = useForm({
        registrar_name: registrarName ?? '',
    });

    return (
        <RoleAwareLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />

            <h1 className="sr-only">System Settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="System Settings"
                        description="Manage system-wide settings and configurations"
                    />

                    {successMessage && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            {successMessage}
                        </div>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>University Registrar</CardTitle>
                            <CardDescription>
                                Set the registrar name used in PDF exports.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    registrarForm.post(
                                        '/settings/system/registrar',
                                        {
                                            preserveScroll: true,
                                        },
                                    );
                                }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="registrar_name">
                                        Registrar Name
                                    </Label>
                                    <Input
                                        id="registrar_name"
                                        value={registrarForm.data.registrar_name}
                                        onChange={(event) =>
                                            registrarForm.setData(
                                                'registrar_name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Enter registrar name"
                                        disabled={registrarForm.processing}
                                    />
                                    {registrarForm.errors.registrar_name && (
                                        <p className="text-sm text-destructive">
                                            {
                                                registrarForm.errors
                                                    .registrar_name
                                            }
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={registrarForm.processing}
                                >
                                    {registrarForm.processing
                                        ? 'Saving...'
                                        : 'Save Registrar Name'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dean Account Provisioning</CardTitle>
                            <CardDescription>
                                Generate and sync dean accounts using department-based email addresses.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <KeyRound className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Generate Dean Accounts</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Uses email format <span className="font-mono">department@spup.edu.ph</span> and default password <span className="font-mono">Spup@12345</span> for new accounts.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => form.post(systemRoutes.deans.generate().url)}
                                            disabled={form.processing}
                                        >
                                            {form.processing ? 'Generating...' : 'Generate Accounts'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Default Password</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deanAccounts.map((account) => (
                                                <TableRow key={account.email}>
                                                    <TableCell>{account.department}</TableCell>
                                                    <TableCell className="font-mono text-xs">{account.email}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {account.default_password}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </RoleAwareLayout>
    );
}
