import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import AccessPage from '@/features/blog/ui/blog/AccessPage';
import { getAccessGrantCookieName, verifyAccessGrant } from '@/shared/lib/content/access-grant';
import { normalizeNextPath } from '@/shared/lib/content/access-api';
import { getTotpGroup } from '@/shared/lib/content/totp';
import { loadMessages } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; group: string }>;
}): Promise<Metadata> {
  const { locale, group } = await params;
  const messages = await loadMessages(locale);
  return localizedMetadata(
    locale,
    `/access/${group}`,
    (messages.pages as Record<string, { title?: string; description?: string }>).access ?? {},
    { robots: { index: false, follow: false } },
  );
}

export default async function Access({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; group: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale, group } = await params;
  const { next } = await searchParams;
  if (!group || !getTotpGroup(group)) notFound();
  const nextPath = typeof next === 'string' ? normalizeNextPath(next) : `/${locale}/content#blog`;
  const grant = (await cookies()).get(getAccessGrantCookieName())?.value;
  if (verifyAccessGrant(grant, group)) redirect(nextPath);
  return (
    <AccessPage
      locale={locale}
      messages={await loadMessages(locale)}
      group={group}
      nextPath={nextPath}
    />
  );
}
