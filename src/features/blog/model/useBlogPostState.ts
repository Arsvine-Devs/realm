import { useActor } from '@xstate/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { BlogPostMeta, TranslationStatus } from '../../../shared/types';
import { type Locale } from '@/shared/contracts/locale';
import type { BlogContentLocale } from '../server/blog';
import {
  blogPostMachine,
  getBlogPostViewState,
  shouldSuppressFallbackBanner,
  type BlogPostArticleInput,
  type BlogPostViewState,
} from './blogPostState';
import {
  blogContentLocaleLabels,
  getRequestedContentLocaleFromPath,
  resolveDefaultContentLocale,
  type BlogVariantPayload,
} from './blogClient';

export { blogContentLocaleLabels };
export type { BlogVariantPayload, BlogPostViewState };

interface UseBlogPostStateOptions {
  routerAsPath: string;
  locale: Locale;
  meta: BlogPostMeta;
  mdxSource: BlogVariantPayload['mdxSource'] | null;
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  actualContentLocale: BlogContentLocale;
  availableContentLocales: BlogContentLocale[];
  contentVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  access: { mode: string; group?: string };
  isProtected: boolean;
  hydrationReady: boolean;
}

interface UseBlogPostStateResult {
  defaultContentLocale: BlogContentLocale;
  requestedContentLocale: BlogContentLocale;
  selectedContentLocale: BlogContentLocale;
  selectedVariant: BlogVariantPayload | null;
  viewState: BlogPostViewState;
  loadingLang: BlogContentLocale | null;
  loadError: string;
  effectiveStatus: TranslationStatus;
  effectiveOriginLocale: Locale;
  updateContentLocaleQuery: (nextContentLocale: BlogContentLocale) => void;
  markAuthGranted: () => void;
  retryRequestedContentLocale: () => void;
}

function writeContentLocaleQuery(nextContentLocale: BlogContentLocale) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('lang', nextContentLocale);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function useBlogPostState({
  routerAsPath,
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
}: UseBlogPostStateOptions): UseBlogPostStateResult {
  const defaultContentLocale = useMemo(
    () => resolveDefaultContentLocale(locale, availableContentLocales, actualContentLocale),
    [actualContentLocale, availableContentLocales, locale],
  );
  const requestedContentLocale =
    getRequestedContentLocaleFromPath(routerAsPath) ?? defaultContentLocale;
  const requiresAuth = isProtected && access.mode !== 'public';
  const baseVariant = useMemo(() => (mdxSource ? { meta, mdxSource } : null), [mdxSource, meta]);
  const variants = useMemo(
    () => ({
      ...contentVariants,
      ...(baseVariant ? { [actualContentLocale]: baseVariant } : {}),
    }),
    [actualContentLocale, baseVariant, contentVariants],
  );
  const articleInput = useMemo<BlogPostArticleInput>(
    () => ({
      slug: meta.slug,
      requestedContentLocale,
      actualContentLocale,
      requiresAuth,
      accessGroup: access.group,
      hydrationReady,
      variants,
    }),
    [
      access.group,
      actualContentLocale,
      hydrationReady,
      meta.slug,
      requestedContentLocale,
      requiresAuth,
      variants,
    ],
  );

  const [snapshot, send] = useActor(blogPostMachine, { input: articleInput });

  // actor 创建时已使用当前 input 初始化。只在 memoized input 对象真正变化时同步；
  // Strict Mode 重放首次 effect 时对象身份不变，因此不会重复发送 ARTICLE_CHANGED。
  // 这里不比较 slug/locale request key，后续每次完整 input 变化仍进入 actor cancellation 流程。
  const committedArticleInputRef = useRef(articleInput);
  useEffect(() => {
    if (committedArticleInputRef.current === articleInput) return;
    committedArticleInputRef.current = articleInput;
    send({ type: 'ARTICLE_CHANGED', ...articleInput });
  }, [articleInput, send]);

  const updateContentLocaleQuery = useCallback(
    (nextContentLocale: BlogContentLocale) => {
      writeContentLocaleQuery(nextContentLocale);
      send({ type: 'SELECT_LOCALE', locale: nextContentLocale });
    },
    [send],
  );
  const markAuthGranted = useCallback(() => send({ type: 'AUTH_GRANTED' }), [send]);
  const retryRequestedContentLocale = useCallback(() => send({ type: 'RETRY' }), [send]);

  const state = snapshot.context;
  const selectedVariant = state.variants[state.displayedContentLocale] ?? null;
  const viewState = getBlogPostViewState(snapshot, state);
  const suppressFallbackBanner = shouldSuppressFallbackBanner({
    displayedContentLocale: state.displayedContentLocale,
    requestedContentLocale: state.requestedContentLocale,
    actualContentLocale,
  });
  const effectiveStatus: TranslationStatus = suppressFallbackBanner ? 'source' : translationStatus;
  const effectiveOriginLocale: Locale = (selectedVariant?.meta.originLocale ??
    meta.originLocale ??
    actualLocale) as Locale;

  return {
    defaultContentLocale,
    requestedContentLocale: state.requestedContentLocale,
    selectedContentLocale: state.displayedContentLocale,
    selectedVariant,
    viewState,
    loadingLang: viewState === 'loadingVariant' ? state.requestedContentLocale : null,
    loadError: state.errorMessage,
    effectiveStatus,
    effectiveOriginLocale,
    updateContentLocaleQuery,
    markAuthGranted,
    retryRequestedContentLocale,
  };
}
