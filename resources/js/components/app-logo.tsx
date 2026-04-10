import { BRAND_SHORT_NAME } from '@/lib/branding';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md border border-sidebar-border bg-white">
                <AppLogoIcon className="size-7 object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {BRAND_SHORT_NAME}
                </span>
            </div>
        </>
    );
}
