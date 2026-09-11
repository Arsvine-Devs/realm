import TweetsPage, { type TweetsPageProps } from '@/features/tweets/ui/TweetsPage';
import { getTweetMonthGroupsPage } from '@/features/tweets/server/github';
import { loadMessages } from '@/app/i18n/data';
import type { Locale } from '@/app/i18n/config';
import { localizedMetadata } from '@/app/metadata';

const INITIAL_MONTH_BATCH_SIZE = 1;
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
    '/tweets',
    (messages.pages as Record<string, { title?: string; description?: string }>).tweets ?? {},
  );
}

export default async function Tweets({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  let monthGroups: TweetsPageProps['monthGroups'] = [];
  let totalMonths = 0;
  let sourceUnavailable = false;
  let sourceError: string | undefined;
  try {
    ({ monthGroups, totalMonths } = await getTweetMonthGroupsPage(0, INITIAL_MONTH_BATCH_SIZE));
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    sourceUnavailable = true;
    sourceError = error instanceof Error ? error.message : 'tweets_source_unavailable';
  }
  return (
    <TweetsPage
      locale={locale}
      messages={messages}
      monthGroups={monthGroups}
      totalMonths={totalMonths}
      monthBatchSize={INITIAL_MONTH_BATCH_SIZE}
      generatedAt={new Date().toISOString()}
      sourceUnavailable={sourceUnavailable}
      sourceError={sourceError}
    />
  );
}
import type { Metadata } from 'next';
