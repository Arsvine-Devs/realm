import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { isLocale, ogLocaleMap } from '@/app/i18n/config';
import { getSiteUrl, siteConfig } from '@/shared/config/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : undefined;
  if (!locale) return {};
  const siteUrl = getSiteUrl();

  return {
    openGraph: {
      siteName: siteConfig.name,
      locale: ogLocaleMap[locale],
      images: [`${siteUrl}${siteConfig.assets.ogImage}`],
    },
    twitter: {
      card: 'summary',
      images: [`${siteUrl}${siteConfig.assets.twitterImage}`],
    },
    alternates: {
      types: {
        'application/rss+xml': `/${locale}/rss.xml`,
      },
    },
  };
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  setRequestLocale(locale);
  return children;
}
