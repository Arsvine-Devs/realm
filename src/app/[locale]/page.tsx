import type { Metadata } from 'next';
import HomePage from '@/features/hud/ui/HomePage';
import type { Locale } from '@/app/i18n/config';
import { loadMessages } from '@/app/i18n/data';
import { localizedMetadata } from '@/app/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  return localizedMetadata(
    locale,
    '/',
    (messages.pages as Record<string, { title?: string; description?: string }>).site ?? {},
  );
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <HomePage locale={locale} messages={{}} />;
}
