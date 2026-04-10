import type { ImgHTMLAttributes } from 'react';
import { BRAND_LOGO_PATH } from '@/lib/branding';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src={BRAND_LOGO_PATH} alt="SPUP Logo" {...props} />
    );
}
