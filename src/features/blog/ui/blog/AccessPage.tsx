'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import SectionPageLayout from '../../../../app/shell/SectionPageLayout';
import type { Locale } from '@/shared/contracts/locale';
import { useTransition } from '../../../navigation/model/TransitionProvider';
import TotpCodeForm from './TotpCodeForm';
import styles from '../../styles/PostAccessPage.module.scss';

export interface AccessPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  group: string;
  nextPath: string;
}

export default function AccessPage({ group, nextPath }: AccessPageProps) {
  const { navigateTo } = useTransition();
  const t = useTranslations('pages.access');
  const handleVerified = useCallback(
    (redirectTo: string) => {
      navigateTo(redirectTo);
    },
    [navigateTo],
  );

  return (
    <SectionPageLayout>
      <section className={styles.page}>
        <header className={styles.header}>
          <h2 className={styles.heading}>{t('heading')}</h2>
          <p className={styles.description}>{t('description')}</p>
        </header>
        <TotpCodeForm
          group={group}
          nextPath={nextPath}
          inputId="totp-token"
          onVerified={handleVerified}
        />
      </section>
    </SectionPageLayout>
  );
}
