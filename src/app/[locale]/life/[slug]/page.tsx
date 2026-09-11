import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LifeDetailPage from '@/features/life/ui/LifeDetailPage';
import { getStaticCatalogAssets } from '@/features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '@/features/assets/server/catalog/hydrate-catalog-assets';
import { loadLife, loadMessages, resolveLifeItem } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const revalidate = 300;
export const dynamicParams = false;
export function generateStaticParams() {
  const base = loadLife(defaultLocale);
  const slugs = [...base.gameData, ...base.travelData, ...base.otherData].map((item) => item.id);
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolved = resolveLifeItem(slug, locale);
  return resolved
    ? localizedMetadata(
        locale,
        `/life/${slug}`,
        { title: `${resolved.item.title.toUpperCase()} // LIFE`, description: resolved.item.title },
        { type: 'article' },
      )
    : {};
}

export default async function LifeDetail({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resolved = resolveLifeItem(slug, locale);
  if (!resolved) notFound();
  const [messages, catalogAssets] = await Promise.all([
    loadMessages(locale),
    getStaticCatalogAssets(),
  ]);
  const life = loadLife(locale);
  return (
    <LifeDetailPage
      locale={locale}
      messages={messages}
      item={hydrateCatalogAssets(resolved.item, catalogAssets)}
      allItems={hydrateCatalogAssets(
        [...life.gameData, ...life.travelData, ...life.otherData],
        catalogAssets,
      )}
      translationStatus={resolved.status}
      actualLocale={resolved.actualLocale}
      originLocale={resolved.originLocale}
    />
  );
}
