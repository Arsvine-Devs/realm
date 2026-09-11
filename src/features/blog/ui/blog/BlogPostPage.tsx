'use client';

import { startTransition, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import MDXComponents from '../mdx/MDXComponents';
import LocaleFallbackBanner from '../../../../shared/ui/LocaleFallbackBanner';
import { AnimatedTitleChars } from '../../../../shared/ui/AnimatedTitleChars';
import useBlogPostState, {
  blogContentLocaleLabels,
  type BlogVariantPayload,
  type BlogPostViewState,
} from '../../model/useBlogPostState';
import type { BlogContentLocale } from '../../server/blog';
import type { ContentPostAccess } from '@/shared/lib/content/types';
import type { BlogPostMeta, TranslationStatus } from '../../../../shared/types';
import BlogDetailScaffold from './BlogDetailScaffold';
import styles from '../../styles/BlogDetailView.module.scss';
import accessStyles from '../../styles/PostAccessPage.module.scss';
import ProtectedPostGate from './ProtectedPostGate';
import BlogStateShell from './BlogStateShell';
import type { Locale } from '@/shared/contracts/locale';
import { formatReadingTime } from '../../model/formatReadingTime';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';
import { animateTitleCharacters } from '@/shared/lib/title-reveal';

export interface BlogPostPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult | null;
  allPosts: BlogPostMeta[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: ContentPostAccess;
  isProtected: boolean;
}

export default function BlogPostPage({
  locale,
  meta,
  mdxSource,
  allPosts,
  translationStatus,
  actualLocale,
  actualContentLocale,
  availableContentLocales,
  contentVariants,
  access,
  isProtected,
}: BlogPostPageProps) {
  const { asPath } = useNavigationRuntime();
  const tCommon = useTranslations('common');
  const [hydrationReady, setHydrationReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setHydrationReady(true);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    defaultContentLocale,
    requestedContentLocale,
    viewState,
    selectedVariant,
    selectedContentLocale,
    loadingLang,
    loadError,
    effectiveStatus,
    effectiveOriginLocale,
    updateContentLocaleQuery,
    markAuthGranted,
    retryRequestedContentLocale,
  } = useBlogPostState({
    routerAsPath: asPath,
    locale,
    meta,
    mdxSource,
    translationStatus,
    actualLocale,
    actualContentLocale,
    availableContentLocales,
    contentVariants,
    access,
    isProtected,
    hydrationReady,
  });

  if (viewState === 'authChecking') {
    return (
      <BlogStateShell
        locale={locale}
        meta={meta}
        allPosts={allPosts}
        defaultContentLocale={defaultContentLocale}
        signalLabel={tCommon('signalFragment')}
        statusText={tCommon('decoding')}
        isProtected={isProtected}
      />
    );
  }

  if (viewState === 'authRequired' && access.mode === 'totp' && access.group) {
    return (
      <ProtectedPostGate
        locale={locale}
        meta={meta}
        allPosts={allPosts}
        defaultContentLocale={defaultContentLocale}
        group={access.group}
        nextContentLocale={requestedContentLocale}
        onVerified={markAuthGranted}
      />
    );
  }

  if (!selectedVariant) {
    return (
      <BlogStateShell
        locale={locale}
        meta={meta}
        allPosts={allPosts}
        defaultContentLocale={defaultContentLocale}
        signalLabel={tCommon('signalFragment')}
        statusText={viewState === 'loadFailed' ? tCommon('loading') : tCommon('decoding')}
        error={loadError}
        action={
          loadError ? (
            <button
              type="button"
              className={styles.articleLocaleRetry}
              onClick={retryRequestedContentLocale}
            >
              {tCommon('retry')}
            </button>
          ) : null
        }
        isProtected={isProtected}
      />
    );
  }

  return (
    <BlogDetailContent
      key={`${locale}:${meta.slug}`}
      locale={locale}
      meta={selectedVariant.meta}
      mdxSource={selectedVariant.mdxSource}
      allPosts={allPosts}
      translationStatus={effectiveStatus}
      actualLocale={actualLocale}
      originLocale={effectiveOriginLocale}
      viewState={viewState}
      selectedContentLocale={selectedContentLocale}
      availableContentLocales={availableContentLocales}
      loadingLang={loadingLang}
      defaultContentLocale={defaultContentLocale}
      updateContentLocaleQuery={updateContentLocaleQuery}
      loadError={loadError}
      retryRequestedContentLocale={retryRequestedContentLocale}
    />
  );
}

function BlogDetailContent({
  locale,
  meta,
  mdxSource,
  allPosts,
  translationStatus,
  actualLocale,
  originLocale,
  viewState,
  selectedContentLocale,
  availableContentLocales,
  loadingLang,
  defaultContentLocale,
  updateContentLocaleQuery,
  loadError,
  retryRequestedContentLocale,
}: Omit<
  BlogPostPageProps,
  'messages' | 'contentVariants' | 'access' | 'isProtected' | 'actualContentLocale' | 'mdxSource'
> & {
  mdxSource: MDXRemoteSerializeResult;
  viewState: BlogPostViewState;
  selectedContentLocale: BlogContentLocale;
  originLocale: Locale;
  loadingLang: BlogContentLocale | null;
  defaultContentLocale: BlogContentLocale;
  updateContentLocaleQuery: (nextContentLocale: BlogContentLocale) => void;
  loadError: string;
  retryRequestedContentLocale: () => void;
}) {
  const tCommon = useTranslations('common');
  const readingLabel = formatReadingTime(meta.readingMinutes, locale);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const titleAnimationKey = `${meta.title}\u0000${selectedContentLocale}`;
  const [completedTitleKey, setCompletedTitleKey] = useState<string | null>(null);
  const titleDone = completedTitleKey === titleAnimationKey;

  useEffect(() => {
    if (!titleRef.current) {
      startTransition(() => {
        setCompletedTitleKey(titleAnimationKey);
      });
      return;
    }
    return animateTitleCharacters({
      root: titleRef.current,
      wrapperSelector: `.${styles.charWrapper}`,
      innerSelector: `.${styles.charInner}`,
      revealDelay: 0.4,
      stagger: 0.06,
      onComplete: () =>
        startTransition(() => {
          setCompletedTitleKey(titleAnimationKey);
        }),
    });
  }, [titleAnimationKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setEntered(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!titleDone) return;
    const body = contentBodyRef.current;
    const wrapper = wrapperRef.current;
    if (!body || !wrapper) return;

    const children = Array.from(body.children) as HTMLElement[];
    if (children.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting);
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${i * 0.07}s`;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          el.addEventListener(
            'transitionend',
            () => {
              el.style.transitionDelay = '';
              el.style.transform = 'none';
            },
            { once: true },
          );
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px', root: wrapper },
    );

    const timer = setTimeout(() => {
      children.forEach((child) => observer.observe(child));
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [titleDone, selectedContentLocale]);

  const handleContentLocaleChange = useCallback(
    (nextContentLocale: BlogContentLocale) => {
      if (loadingLang) {
        return;
      }
      if (nextContentLocale === selectedContentLocale && viewState !== 'loadFailed') {
        return;
      }
      updateContentLocaleQuery(nextContentLocale);
    },
    [loadingLang, selectedContentLocale, updateContentLocaleQuery, viewState],
  );

  return (
    <>
      <BlogDetailScaffold
        locale={locale}
        meta={meta}
        allPosts={allPosts}
        defaultContentLocale={defaultContentLocale}
        headerEntered={entered}
        scrollRootRef={wrapperRef}
        headerContent={
          <>
            {translationStatus !== 'source' && (
              <LocaleFallbackBanner
                requestedLocale={locale}
                actualLocale={actualLocale}
                originLocale={originLocale}
                status={translationStatus}
              />
            )}

            <div className={styles.headerContent}>
              <span className={styles.headerSignal}>{tCommon('signalFragment')}</span>
              <h1 ref={titleRef} className={styles.headerTitle}>
                <AnimatedTitleChars
                  text={meta.title}
                  wrapperClassName={styles.charWrapper}
                  innerClassName={styles.charInner}
                  wordWrapperClassName={styles.wordWrapper}
                  uppercase={false}
                />
              </h1>
              <div className={styles.headerMeta}>
                {meta.date && <span className={styles.headerDate}>{meta.date}</span>}
                {readingLabel && <span className={styles.headerReadingTime}>{readingLabel}</span>}
              </div>
              {availableContentLocales.length > 1 && (
                <div
                  className={styles.articleLocaleSwitcher}
                  aria-label="Article language switcher"
                >
                  {availableContentLocales.map((contentLocale) => (
                    <button
                      key={contentLocale}
                      type="button"
                      className={`${styles.articleLocaleButton} ${selectedContentLocale === contentLocale ? styles.activeArticleLocaleButton : ''}`}
                      onClick={() => handleContentLocaleChange(contentLocale)}
                      disabled={Boolean(loadingLang)}
                    >
                      {blogContentLocaleLabels[contentLocale]}
                    </button>
                  ))}
                </div>
              )}
              {loadError ? (
                <div className={styles.articleLocaleErrorRow}>
                  <p className={accessStyles.error}>{loadError}</p>
                  <button
                    type="button"
                    className={styles.articleLocaleRetry}
                    onClick={retryRequestedContentLocale}
                    disabled={Boolean(loadingLang)}
                  >
                    {tCommon('retry')}
                  </button>
                </div>
              ) : null}
              {meta.tags.length > 0 && (
                <div className={styles.headerTags}>
                  {meta.tags.map((tag) => (
                    <span key={tag} className={styles.headerTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        }
        contentContent={
          <>
            {(!titleDone || viewState === 'loadingVariant') && (
              <div className={styles.loadingIndicator}>
                <span className={styles.loadingText}>{tCommon('decoding')}</span>
              </div>
            )}
            <div key={selectedContentLocale} ref={contentBodyRef} className={styles.contentBody}>
              <MDXRemote {...mdxSource} components={MDXComponents} />
            </div>
          </>
        }
      />
    </>
  );
}
