import CopyrightPage from '@/features/profile/ui/CopyrightPage';
import { loadMessages } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
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
    '/copyright',
    (messages.pages as Record<string, { title?: string; description?: string }>).copyright ?? {},
  );
}

export default async function Copyright({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <CopyrightPage locale={locale} messages={await loadMessages(locale)} />;
}
import type { Metadata } from 'next';
