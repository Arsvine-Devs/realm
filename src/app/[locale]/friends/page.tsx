import FriendsPage from '@/features/profile/ui/FriendsPage';
import { getStaticCatalogAssets } from '@/features/assets/server/catalog/catalog-provider';
import { hydrateCatalogAssets } from '@/features/assets/server/catalog/hydrate-catalog-assets';
import { loadFriendLinks, loadMessages, loadServices } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  return localizedMetadata(
    locale,
    '/friends',
    (messages.pages as Record<string, { title?: string; description?: string }>).friends ?? {},
  );
}

export default async function Friends({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [messages, catalogAssets] = await Promise.all([
    loadMessages(locale),
    getStaticCatalogAssets(),
  ]);
  const page =
    (messages.pages as Record<string, { title?: string; description?: string }>).friends ?? {};
  return (
    <FriendsPage
      locale={locale}
      messages={messages}
      friends={hydrateCatalogAssets(loadFriendLinks(locale).friendLinksData, catalogAssets)}
      services={loadServices()}
      pageTitle={page.title ?? 'FRIENDS'}
      pageDescription={page.description ?? ''}
    />
  );
}
import type { Metadata } from 'next';
