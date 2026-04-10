import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { BRAND_LONG_NAME, BRAND_SHORT_NAME } from '@/lib/branding';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome" />

            <div className="relative min-h-screen overflow-hidden">
            <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
                    style={{
                        backgroundSize: '170% auto',
                        backgroundPosition: 'center top',
                        backgroundImage: "url('/hero-image-mobile.jpg')",
                    }}
                />

                {/* Background Image - desktop */}
                <div
                    className="absolute inset-0 hidden bg-no-repeat md:block"
                    style={{
                        backgroundImage: "url('/hero-image-desktop.jpg')",
                        backgroundSize: 'auto 120%',
                        backgroundPosition: 'calc(100% + 120px) center',
                    }}
                />

                {/* Dark Green Overlay */}
                <div
                    className="absolute inset-0 md:hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(3,102,53,0.2) 0%, rgba(3,102,53,1) 55%)',
                    }}
                />
                <div
                    className="absolute inset-0 hidden md:block"
                    style={{
                        background: 'linear-gradient(90deg, rgba(3,102,53,1) 25%, rgba(3,102,53,0) 100%)',
                    }}
                />

                <main className="relative z-10 min-h-screen">
                    <section className="flex min-h-screen items-center justify-center px-4 py-10 md:hidden">
                        <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/12 p-6 text-center text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                                <AppLogoIcon className="h-full w-full object-contain" />
                            </div>
                            <p className="text-xs font-semibold tracking-[0.2em] text-white/85">
                                {BRAND_SHORT_NAME}
                            </p>
                            <h1 className="mt-3 text-lg font-bold">
                                Mobile View Disabled
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-white/85">
                                For a better experience, please access{' '}
                                {BRAND_SHORT_NAME} on a desktop or laptop
                                screen.
                            </p>
                        </div>
                    </section>

                    <section className="hidden min-h-screen items-center justify-center px-4 py-10 md:flex">
                        <div className="w-full max-w-3xl rounded-3xl border border-white/25 bg-white/12 p-6 text-center text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-10">
                        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center ">
                            <AppLogoIcon className="h-full w-full object-contain" />
                        </div>

                        <p className="text-xs font-semibold tracking-[0.22em] text-white/85 sm:text-sm">
                            {BRAND_SHORT_NAME}
                        </p>
                        <h1 className="mt-3 text-balance text-2xl font-bold sm:text-4xl">
                            {BRAND_LONG_NAME}
                        </h1>
                        <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
                            Manage faculty grading workflows in one place:
                            term setup, faculty loads, subject status updates,
                            and audit tracking.
                        </p>

                        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                            {auth.user ? (
                                <Button
                                    asChild
                                    size="lg"
                                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                >
                                    <Link href={dashboard()}>
                                        Open Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        asChild
                                        size="lg"
                                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                    >
                                        <Link href={login()}>
                                            Sign in
                                        </Link>
                                    </Button>

                                </>
                            )}
                        </div>
                    </div>
                    </section>
                </main>
            </div>
        </>
    );
}
