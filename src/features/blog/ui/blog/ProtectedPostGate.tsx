'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { buildBlogPostHref } from '../../model/blogClient';
import type { BlogContentLocale } from '../../server/blog';
import { type Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta } from '../../../../shared/types';
import BlogDetailScaffold from './BlogDetailScaffold';
import TotpCodeForm from './TotpCodeForm';
import styles from '../../styles/BlogDetailView.module.scss';
import accessStyles from '../../styles/PostAccessPage.module.scss';

interface ProtectedPostGateProps {
  locale: Locale;
  meta: BlogPostMeta;
  allPosts: BlogPostMeta[];
  defaultContentLocale: BlogContentLocale;
  group: string;
  nextContentLocale: BlogContentLocale;
  onVerified: () => void | Promise<void>;
}

export default function ProtectedPostGate({
  locale,
  meta,
  allPosts,
  defaultContentLocale,
  group,
  nextContentLocale,
  onVerified,
}: ProtectedPostGateProps) {
  const t = useTranslations('pages.access');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => setEntered(true));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const nextPath = buildBlogPostHref(locale, meta.slug, nextContentLocale);
  const handleVerified = useCallback(async () => {
    await onVerified();
  }, [onVerified]);

  return (
    <BlogDetailScaffold
      locale={locale}
      meta={meta}
      allPosts={allPosts}
      defaultContentLocale={defaultContentLocale}
      headerEntered={entered}
      headerContent={
        <div className={styles.headerContent}>
          <span className={styles.headerSignal}>{t('heading')}</span>
          <h1 className={styles.headerTitle}>{meta.title}</h1>
          <div className={styles.headerMeta}>
            {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
            <span className={styles.headerReadingTime}>{t('description')}</span>
          </div>
        </div>
      }
      contentContent={
        <div className={`${accessStyles.page} ${accessStyles.embedded}`}>
          <TotpCodeForm
            group={group}
            nextPath={nextPath}
            inputId="totp-token-inline"
            onVerified={handleVerified}
          />
        </div>
      }
    />
  );
}
