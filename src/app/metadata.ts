import type { Metadata } from 'next';

import { locales, ogLocaleMap, type Locale } from '@/app/i18n/config';
import { getSiteUrl, siteConfig } from '@/shared/config/site';

type PageCopy = { title?: string; description?: string };

export function localizedMetadata(
  locale: Locale,
  path: string,
  copy: PageCopy,
  options: {
    type?: 'article' | 'website';
    robots?: Metadata['robots'];
  } = {},
): Metadata {
  const normalizedPath = path === '/' ? '' : path;
  const url = `${getSiteUrl()}/${locale}${normalizedPath}`;
  const title = copy.title || siteConfig.metaTitle;
  const description = copy.description || siteConfig.metaDescription;
  const languages = Object.fromEntries(
    locales.map((candidate) => [candidate, `/${candidate}${normalizedPath || '/'}`]),
  );

  return {
    title,
    description,
    robots: options.robots,
    alternates: { canonical: url, languages },
    openGraph: {
      title,
      description,
      url,
      type: options.type ?? 'website',
      locale: ogLocaleMap[locale],
      siteName: siteConfig.name,
      images: [`${getSiteUrl()}${siteConfig.assets.ogImage}`],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [`${getSiteUrl()}${siteConfig.assets.twitterImage}`],
    },
  };
}
