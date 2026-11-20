import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import '@/app/styles/globals.scss';
// Segment-level not-found CSS is part of every route resource graph. Consume
// it in the stable root so Next does not emit a preload-only stylesheet.
import '@/features/navigation/styles/NotFoundPage.module.scss';
import DocumentBootstrapScript from '@/app/providers/DocumentBootstrapScript';
import LocaleClientProviders from '@/app/providers/LocaleClientProviders';
import { defaultLocale, htmlLangMap } from '@/app/i18n/config';
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
  await connection();
  const mediaBase = getPublicMediaBase();
  const catalog = await getStaticCatalogAssets().catch(() => ({}));
  const assets = Object.fromEntries(
    Object.entries(catalog).map(([key, asset]) => [
      key,
      buildManagedAssetUrl(asset.objectKey, mediaBase),
    ]),
  );
  return (
    <html lang={htmlLangMap[defaultLocale]} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' ? (
          <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        ) : null}
        <link
          href={buildManagedAssetUrl(siteConfig.fonts.stylesheetKey, mediaBase)}
          rel="stylesheet"
          crossOrigin="anonymous"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <DocumentBootstrapScript script={buildDocumentBootstrapScript()} />
      </head>
      <body>
        <LocaleClientProviders assets={assets} mediaBase={mediaBase}>
          {children}
        </LocaleClientProviders>
      </body>
    </html>
  );
}
