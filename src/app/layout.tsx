import type { Metadata, Viewport } from 'next';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={htmlLangMap[defaultLocale]} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' ? (
          <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        ) : null}
        {siteConfig.fonts.cdnPreconnect.map((preconnect) => (
          <link
            key={preconnect.href}
            rel="preconnect"
            href={preconnect.href}
            {...(preconnect.crossOrigin ? { crossOrigin: preconnect.crossOrigin } : {})}
          />
        ))}
        <link href={siteConfig.fonts.cdnStylesheet} rel="stylesheet" />
        <DocumentBootstrapScript script={buildDocumentBootstrapScript()} />
      </head>
      <body>
        <LocaleClientProviders>{children}</LocaleClientProviders>
      </body>
    </html>
  );
}
