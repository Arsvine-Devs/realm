'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../../app/shell/SectionPageLayout';
import type { ProtectedVerifyResponse } from '@/shared/lib/content/access-api';
import type { Locale } from '@/shared/contracts/locale';
import { useTransition } from '../../../navigation/model/TransitionProvider';
import styles from '../../styles/PostAccessPage.module.scss';

export interface AccessPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  group: string;
  nextPath: string;
}

export default function AccessPage({ locale, group, nextPath }: AccessPageProps) {
  const { navigateTo } = useTransition();
  const t = useTranslations('pages.access');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedTokenRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const submitToken = useCallback(
    async (nextToken: string) => {
      if (submitting || nextToken.length !== 6 || lastSubmittedTokenRef.current === nextToken) {
        return;
      }

      lastSubmittedTokenRef.current = nextToken;
      setSubmitting(true);
      setError('');

      try {
        const response = await fetch('/api/protected-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group,
            token: nextToken,
            next: nextPath,
          }),
        });

        const json = (await response.json()) as ProtectedVerifyResponse;

        if (!response.ok || !json.ok || !json.redirectTo) {
          if ('error' in json) {
            throw new Error(json.error.message || t('invalidToken'));
          }
          throw new Error(t('invalidToken'));
        }

        navigateTo(json.redirectTo);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : t('invalidToken'));
      } finally {
        setSubmitting(false);
      }
    },
    [group, navigateTo, nextPath, submitting, t],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submitToken(token);
    },
    [submitToken, token],
  );

  const handleTokenChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextToken = event.target.value.replace(/\D+/g, '').slice(0, 6);
      lastSubmittedTokenRef.current = nextToken.length === 6 ? lastSubmittedTokenRef.current : null;
      setError('');
      setToken(nextToken);
      if (nextToken.length === 6) {
        void submitToken(nextToken);
      }
    },
    [submitToken],
  );

  const handleFieldClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <>
      <SectionPageLayout>
        <section className={styles.page}>
          <header className={styles.header}>
            <h2 className={styles.heading}>{t('heading')}</h2>
            <p className={styles.description}>{t('description')}</p>
          </header>

          <form className={styles.card} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="totp-token">
              {t('tokenLabel')}
            </label>
            <div className={styles.codeField} onClick={handleFieldClick} role="presentation">
              <input
                ref={inputRef}
                id="totp-token"
                className={styles.hiddenInput}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                /* oxlint-disable-next-line jsx-a11y/no-autofocus -- the gate has one visible field represented by this focused input. */
                autoFocus
                value={token}
                disabled={submitting}
                onChange={handleTokenChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <div className={styles.slotGrid} aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => {
                  const char = token[index] ?? '';
                  const isActive =
                    isFocused && index === Math.min(token.length, 5) && token.length < 6;
                  const isFilled = char !== '';

                  return (
                    <span
                      key={index}
                      className={`${styles.slot}${isFilled ? ` ${styles.slotFilled}` : ''}${isActive ? ` ${styles.slotActive}` : ''}`}
                    >
                      {char || '\u00A0'}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className={styles.hint}>{t('hint')}</p>
            <p className={styles.status} aria-live="polite">
              {submitting ? t('verifying') : '\u00A0'}
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button
              className={styles.hiddenSubmit}
              type="submit"
              tabIndex={-1}
              aria-hidden="true"
            />
          </form>
        </section>
      </SectionPageLayout>
    </>
  );
}
