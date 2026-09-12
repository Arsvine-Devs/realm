import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

import type { BlogPostMeta } from '../../../shared/types';
import { defaultLocale, isLocale, type Locale } from '@/shared/contracts/locale';

const blogContentLocales = ['zh-CN', 'zh-TW', 'en', 'ja', 'ru', 'fr'] as const;
export type BlogContentLocale = (typeof blogContentLocales)[number];

export function isBlogContentLocale(value: unknown): value is BlogContentLocale {
  return typeof value === 'string' && (blogContentLocales as readonly string[]).includes(value);
}

export const blogContentLocaleLabels: Record<BlogContentLocale, string> = {
  'zh-CN': '简中',
  'zh-TW': '繁中',
  en: 'English',
  ja: '日本語',
  ru: 'Русский',
  fr: 'Français',
};

// Control characters are rejected before remote content paths are constructed.
// oxlint-disable-next-line eslint/no-control-regex -- matching C0 controls is the security contract here.
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;
const PROTOCOL_PREFIX_RE = /^[A-Za-z][A-Za-z\d+.-]*:/;

export interface BlogVariantPayload {
  meta: BlogPostMeta;
  mdxSource: MDXRemoteSerializeResult;
}

export function getRequestedContentLocaleFromPath(currentUrl: string): BlogContentLocale | null {
  const query = currentUrl.split('?')[1]?.split('#')[0];
  if (!query) {
    return null;
  }

  const lang = new URLSearchParams(query).get('lang');
  return lang && isBlogContentLocale(lang) ? lang : null;
}

export function resolveDefaultContentLocale(
  pageLocale: Locale,
  availableLocales: BlogContentLocale[],
  fallbackLocale: BlogContentLocale,
): BlogContentLocale {
  if (availableLocales.includes(pageLocale)) {
    return pageLocale;
  }
  return fallbackLocale;
}

export function buildBlogIndexHref(locale: Locale) {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  return `/${safeLocale}/content#blog`;
}

export function isSafeBlogSlugSegment(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  if (value !== value.trim()) {
    return false;
  }

  let decodedValue: string;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    return false;
  }

  return (
    value.length > 0 &&
    !CONTROL_CHAR_RE.test(value) &&
    !value.startsWith('/') &&
    !value.startsWith('\\') &&
    !value.startsWith('//') &&
    !PROTOCOL_PREFIX_RE.test(value) &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#') &&
    !value.includes('..') &&
    decodedValue.length > 0 &&
    decodedValue !== '.' &&
    decodedValue !== '..' &&
    !CONTROL_CHAR_RE.test(decodedValue) &&
    !decodedValue.includes('/') &&
    !decodedValue.includes('\\') &&
    !decodedValue.includes('?') &&
    !decodedValue.includes('#') &&
    !decodedValue.includes('..')
  );
}

export function buildBlogPostHref(locale: Locale, slug: string, contentLocale: BlogContentLocale) {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  const safeContentLocale = isBlogContentLocale(contentLocale) ? contentLocale : safeLocale;
  if (!isSafeBlogSlugSegment(slug)) {
    return buildBlogIndexHref(safeLocale);
  }

  return `/${safeLocale}/blog/${encodeURIComponent(slug)}?lang=${encodeURIComponent(safeContentLocale)}`;
}

export function buildPostVariantApiPath(locale: BlogContentLocale, slug: string) {
  const search = new URLSearchParams({
    locale,
    slug,
  });
  return `/api/post-variant?${search.toString()}`;
}
