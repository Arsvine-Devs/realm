'use client';

import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import TweetsSection from './TweetsSection';
import type { Locale } from '@/shared/contracts/locale';
import type { TweetMonthGroup } from '../model/types';

export interface TweetsPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  monthGroups: TweetMonthGroup[];
  totalMonths: number;
  monthBatchSize: number;
  generatedAt: string;
  sourceUnavailable?: boolean;
  sourceError?: string | null;
}

export default function TweetsPage({
  locale,
  monthGroups,
  totalMonths,
  monthBatchSize,
  generatedAt,
  sourceUnavailable,
  sourceError,
}: TweetsPageProps) {
  return (
    <SectionPageLayout>
      <TweetsSection
        locale={locale}
        monthGroups={monthGroups}
        totalMonths={totalMonths}
        monthBatchSize={monthBatchSize}
        generatedAt={generatedAt}
        sourceUnavailable={sourceUnavailable}
        sourceError={sourceError}
      />
    </SectionPageLayout>
  );
}
