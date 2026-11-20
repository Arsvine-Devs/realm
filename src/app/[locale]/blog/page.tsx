import { redirect } from 'next/navigation';
import type { Locale } from '@/app/i18n/config';

export default async function BlogIndex({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  redirect(`/${locale}/content#blog`);
}
