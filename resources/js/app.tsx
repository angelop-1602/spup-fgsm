import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';
import { BRAND_PRIMARY, BRAND_SHORT_NAME } from './lib/branding';

const appName = import.meta.env.VITE_APP_NAME || BRAND_SHORT_NAME;

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
                <Toaster position="bottom-left" richColors closeButton />
            </StrictMode>,
        );
    },
    progress: {
        color: BRAND_PRIMARY,
    },
});

// This will set light / dark mode on load...
initializeTheme();
