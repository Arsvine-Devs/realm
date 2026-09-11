'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import { useTransition } from '../model/TransitionProvider';
import { resolveLocale } from '@/shared/contracts/locale';
import styles from '../styles/NotFoundPage.module.scss';
import { useNavigationRuntime } from '../model/NavigationRuntime';
import { useRegisterNotFoundPresence } from '../model/notFoundPresence';

export default function NotFoundView() {
  useRegisterNotFoundPresence();
  const { asPath, query } = useNavigationRuntime();
  const { navigateTo } = useTransition();
  const locale = resolveLocale(query.locale, asPath);
  const t = useTranslations('pages.notFound');
  const requestedPath = useSyncExternalStore(
    () => () => {},
    () => (asPath && asPath !== '/404' ? asPath : ''),
    () => '',
  );

  return (
    <>
      <SectionPageLayout>
        <section className={styles.page}>
          <div className={styles.panel}>
            <p className={styles.signal}>{t('signal')}</p>

            <div className={styles.codeRow}>
              <span className={styles.code}>404</span>
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.status}>{t('status')}</span>
            </div>

            <h1 className={styles.heading}>{t('heading')}</h1>
            <p className={styles.description}>{t('description')}</p>
            <p className={styles.hint}>{t('hint')}</p>

            <p className={styles.pathLine} hidden={!requestedPath} aria-hidden={!requestedPath}>
              <span className={styles.pathLabel}>{t('pathLabel')}</span>
              <code className={styles.pathValue}>{requestedPath || '\u00A0'}</code>
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionLink}
                onClick={() => navigateTo(`/${locale}`)}
                data-cursor-label={t('returnHome')}
              >
                {t('returnHome')}
              </button>
              <button
                type="button"
                className={styles.actionLink}
                onClick={() => navigateTo(`/${locale}/content`)}
                data-cursor-label={t('returnContent')}
              >
                {t('returnContent')}
              </button>
            </div>
          </div>
        </section>
      </SectionPageLayout>
    </>
  );
}
