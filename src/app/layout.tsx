import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import '@/app/styles/globals.scss';
// Segment-level not-found CSS is part of every route resource graph. Consume
// it in the stable root so Next does not emit a preload-only stylesheet.
import '@/features/navigation/styles/NotFoundPage.module.scss';
import DocumentBootstrapScript from '@/app/providers/DocumentBootstrapScript';
import DeferredFontStyles from '@/app/providers/DeferredFontStyles';
import LocaleClientProviders from '@/app/providers/LocaleClientProviders';
import { htmlLangMap, resolveLocale, ROUTE_LOCALE_HEADER } from '@/shared/contracts/locale';
import { siteConfig, getSiteUrl } from '@/shared/config/site';
import { buildDocumentBootstrapScript } from '@/shared/lib/document-bootstrap';
import { buildManagedAssetUrl, getPublicMediaBase } from '@/shared/lib/media';
import { getStaticCatalogAssets } from '@/features/assets/server/catalog/catalog-provider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: siteConfig.metaTitle,
  description: siteConfig.metaDescription,
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/icons/site.webmanifest',
  openGraph: {
    siteName: siteConfig.name,
    images: [`${getSiteUrl()}${siteConfig.assets.ogImage}`],
  },
  twitter: {
    card: 'summary',
    images: [`${getSiteUrl()}${siteConfig.assets.twitterImage}`],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get(ROUTE_LOCALE_HEADER));
  const nonce = requestHeaders.get('x-arsvine-nonce') ?? undefined;
  const mediaBase = getPublicMediaBase();
  const catalog = await getStaticCatalogAssets().catch(() => ({}));
  const assets = Object.fromEntries(
    Object.entries(catalog).map(([key, asset]) => [
      key,
      buildManagedAssetUrl(asset.objectKey, mediaBase),
    ]),
  );
  return (
    <html lang={htmlLangMap[locale]} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link
          href={buildManagedAssetUrl(siteConfig.fonts.firstPaintFontKey, mediaBase)}
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          href={buildManagedAssetUrl(siteConfig.fonts.criticalStylesheetKey, mediaBase)}
          rel="stylesheet"
          crossOrigin="anonymous"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <DocumentBootstrapScript script={buildDocumentBootstrapScript()} nonce={nonce} />
      </head>
      <body>
        <DeferredFontStyles
          href={buildManagedAssetUrl(siteConfig.fonts.extendedStylesheetKey, mediaBase)}
        />
        <LocaleClientProviders assets={assets} mediaBase={mediaBase}>
          {children}
        </LocaleClientProviders>
      </body>
    </html>
  );
}
