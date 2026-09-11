import React, { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buildBlogPostHref } from '../../model/blogClient';
import type { ProtectedVerifyResponse } from '@/shared/lib/content/access-api';
import type { BlogContentLocale } from '../../server/blog';
import { type Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta } from '../../../../shared/types';
import BlogDetailScaffold from './BlogDetailScaffold';
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

/**
 * 受保护博客的 TOTP 输入门禁（与 /[locale]/access/[group] 共享同一 UI 风格）。
 * 自身管 token / submitting / error / entered 状态，6 位自动提交。
 */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedTokenRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setEntered(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
            next: buildBlogPostHref(locale, meta.slug, nextContentLocale),
          }),
        });

        const json = (await response.json()) as ProtectedVerifyResponse;

        if (!response.ok || !json.ok) {
          if ('error' in json) {
            throw new Error(json.error.message || t('invalidToken'));
          }
          throw new Error(t('invalidToken'));
        }

        await onVerified();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : t('invalidToken'));
      } finally {
        setSubmitting(false);
      }
    },
    [group, locale, meta.slug, nextContentLocale, onVerified, submitting, t],
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

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (token.length === 6) {
        void submitToken(token);
      }
    },
    [submitToken, token],
  );

  return (
    <>
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
            <form className={accessStyles.card} onSubmit={handleSubmit}>
              <label className={accessStyles.label} htmlFor="totp-token-inline">
                {t('tokenLabel')}
              </label>
              <div
                className={accessStyles.codeField}
                onClick={handleFieldClick}
                role="presentation"
              >
                <input
                  ref={inputRef}
                  id="totp-token-inline"
                  className={accessStyles.hiddenInput}
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
                <div className={accessStyles.slotGrid} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => {
                    const char = token[index] ?? '';
                    const isActive =
                      isFocused && index === Math.min(token.length, 5) && token.length < 6;
                    const isFilled = char !== '';

                    return (
                      <span
                        key={index}
                        className={`${accessStyles.slot}${isFilled ? ` ${accessStyles.slotFilled}` : ''}${isActive ? ` ${accessStyles.slotActive}` : ''}`}
                      >
                        {char || ' '}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className={accessStyles.hint}>{t('hint')}</p>
              <p className={accessStyles.status} aria-live="polite">
                {submitting ? t('verifying') : ' '}
              </p>
              {error ? <p className={accessStyles.error}>{error}</p> : null}
              <button
                className={accessStyles.hiddenSubmit}
                type="submit"
                tabIndex={-1}
                aria-hidden="true"
              />
            </form>
          </div>
        }
      />
    </>
  );
}
