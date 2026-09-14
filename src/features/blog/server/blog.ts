import { defaultLocale, locales, isLocale, type Locale } from '@/shared/contracts/locale';
import type { BlogPostMeta, TranslationStatus } from '../../../shared/types';
import {
  fetchPublishedBlogIndex,
  fetchPublishedPostVariant,
} from '@/shared/lib/content/content-api';
import type { ContentBlogIndexItem, ContentPostAccess } from '@/shared/lib/content/types';

const blogContentLocales = [...locales, 'ja', 'ru', 'fr'] as const;
export type BlogContentLocale = (typeof blogContentLocales)[number];

const LATIN_WORDS_PER_MINUTE: Record<BlogContentLocale, number> = {
  'zh-CN': 115,
  'zh-TW': 115,
  en: 115,
  ja: 115,
  ru: 115,
  fr: 115,
};
const CJK_CHARS_PER_MINUTE: Record<BlogContentLocale, number> = {
  'zh-CN': 200,
  'zh-TW': 200,
  en: 200,
  ja: 200,
  ru: 200,
  fr: 200,
};

const CJK_CHAR_RE = /[㐀-䶿一-鿿぀-ゟ゠-ヿ가-힯]/g;
const LATIN_WORD_RE = /[A-Za-zÀ-ɏЀ-ӿ]+(?:['-][A-Za-zÀ-ɏЀ-ӿ]+)*/g;

type BlogIndexVariant = {
  title: string;
  excerpt: string;
  tags?: string[];
  originLocale?: string;
  readingMinutes?: number;
};

export function isBlogContentLocale(value: unknown): value is BlogContentLocale {
  return typeof value === 'string' && (blogContentLocales as readonly string[]).includes(value);
}

export function normalizeAccess(access?: ContentPostAccess): ContentPostAccess {
  if (access?.mode === 'totp') {
    return { mode: 'totp', group: access.group?.trim() || undefined };
  }
  return { mode: 'public' };
}

function resolveOriginLocale(value: string | undefined): Locale | undefined {
  return value && isLocale(value) ? value : undefined;
}

async function readVariantDocument(
  slug: string,
  locale: BlogContentLocale,
  protectedContent = false,
) {
  const variant = await fetchPublishedPostVariant(slug, locale, {
    protected: protectedContent,
  });
  return {
    data: {
      title: variant.title,
      excerpt: variant.excerpt,
      date: variant.date,
      updated: variant.updatedAt,
      tags: variant.tags,
      access: variant.access,
      originLocale: variant.originLocale,
    },
    content: variant.bodyMdx,
  };
}

function getVariantForLocale(
  entry: ContentBlogIndexItem,
  locale: BlogContentLocale,
): BlogIndexVariant | null {
  return (entry.variants[locale] as BlogIndexVariant | undefined) ?? null;
}

function getPreferredVariantLocale(entry: ContentBlogIndexItem, locale: Locale): BlogContentLocale {
  if (entry.availableLocales.includes(locale)) {
    return locale;
  }
  if (entry.availableLocales.includes(defaultLocale)) {
    return defaultLocale;
  }
  const fallback = entry.availableLocales.find((item) => isBlogContentLocale(item));
  if (!fallback) {
    throw new Error(`No available locales for slug: ${entry.slug}`);
  }
  return fallback;
}

function resolveVariantTags(
  entry: ContentBlogIndexItem,
  actualContentLocale: BlogContentLocale,
): string[] {
  const variant = getVariantForLocale(entry, actualContentLocale);
  if (Array.isArray(variant?.tags) && variant.tags.length > 0) {
    return variant.tags;
  }
  return entry.tags;
}

function buildVariantMeta(
  entry: ContentBlogIndexItem,
  actualContentLocale: BlogContentLocale,
  readingMinutes: number,
): BlogPostMeta {
  const variant = getVariantForLocale(entry, actualContentLocale);
  const title = variant?.title?.trim() || entry.slug;
  const excerpt = variant?.excerpt?.trim() || '';
  const originLocale = resolveOriginLocale(variant?.originLocale);

  return {
    slug: entry.slug,
    title,
    date: entry.date,
    updated: entry.updatedAt,
    excerpt,
    tags: resolveVariantTags(entry, actualContentLocale),
    readingMinutes,
    pinned: entry.pinned,
    ...(originLocale ? { originLocale } : {}),
    access: normalizeAccess(entry.access),
  };
}

function getVariantMeta(
  entry: ContentBlogIndexItem,
  actualContentLocale: BlogContentLocale,
  content: string,
): BlogPostMeta {
  return buildVariantMeta(
    entry,
    actualContentLocale,
    estimateReadingMinutes(content, actualContentLocale),
  );
}

function getVariantMetaFromIndex(
  entry: ContentBlogIndexItem,
  actualContentLocale: BlogContentLocale,
): BlogPostMeta {
  const readingMinutes = getVariantForLocale(entry, actualContentLocale)?.readingMinutes ?? 1;
  return buildVariantMeta(entry, actualContentLocale, readingMinutes);
}

function getTranslationStatus(
  requestedLocale: Locale,
  actualContentLocale: BlogContentLocale,
  originLocale: Locale | undefined,
): TranslationStatus {
  if (requestedLocale !== actualContentLocale) {
    return 'fallback';
  }
  if (originLocale && originLocale !== requestedLocale) {
    return 'translated';
  }
  return 'source';
}

function sanitizeProtectedPostMeta(meta: BlogPostMeta): BlogPostMeta {
  if (meta.access.mode !== 'totp') {
    return meta;
  }

  return {
    ...meta,
    excerpt: '',
    tags: [],
    readingMinutes: 0,
  };
}

function estimateReadingMinutes(content: string, locale: BlogContentLocale): number {
  if (!content) return 1;

  const stripped = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/^\s*(?:import|export)\s.+$/gm, ' ');

  const cjkChars = stripped.match(CJK_CHAR_RE)?.length ?? 0;
  const latinWords = stripped.match(LATIN_WORD_RE)?.length ?? 0;

  const cpm = CJK_CHARS_PER_MINUTE[locale] ?? CJK_CHARS_PER_MINUTE[defaultLocale];
  const wpm = LATIN_WORDS_PER_MINUTE[locale] ?? LATIN_WORDS_PER_MINUTE[defaultLocale];

  const minutes = cjkChars / cpm + latinWords / wpm;
  return Math.max(1, Math.ceil(minutes));
}

async function getBlogIndexEntry(slug: string) {
  const index = await fetchPublishedBlogIndex();
  return index.posts.find((post) => post.slug === slug) ?? null;
}

export async function getBlogPostEntry(slug: string) {
  return getBlogIndexEntry(slug);
}

export async function getPostSlugs(): Promise<string[]> {
  const index = await fetchPublishedBlogIndex();
  return index.posts.map((post) => post.slug);
}

export async function getAvailablePostContentLocales(slug: string): Promise<BlogContentLocale[]> {
  const entry = await getBlogIndexEntry(slug);
  if (!entry) return [];

  return entry.availableLocales
    .filter(isBlogContentLocale)
    .sort((left, right) => blogContentLocales.indexOf(left) - blogContentLocales.indexOf(right));
}

export async function getPostBySlugAndContentLocale(slug: string, locale: BlogContentLocale) {
  const entry = await getBlogIndexEntry(slug);
  if (!entry) {
    throw new Error(`No post found for slug: ${slug}`);
  }

  if (!entry.availableLocales.includes(locale)) {
    throw new Error(`No post variant found for slug: ${slug}, locale: ${locale}`);
  }

  const parsed = await readVariantDocument(slug, locale, entry.access.mode === 'totp');
  const meta = getVariantMeta(entry, locale, parsed.content);

  return {
    meta,
    content: parsed.content,
    actualLocale: locale,
  };
}

export async function getPostMetaBySlugAndLocale(slug: string, locale: Locale) {
  const entry = await getBlogIndexEntry(slug);
  if (!entry) {
    throw new Error(`No post found for slug: ${slug}`);
  }

  const actualContentLocale = getPreferredVariantLocale(entry, locale);
  const meta = getVariantMetaFromIndex(entry, actualContentLocale);
  const translationStatus = getTranslationStatus(locale, actualContentLocale, meta.originLocale);

  return {
    meta,
    requestedLocale: locale,
    actualLocale:
      actualContentLocale === 'zh-CN' ||
      actualContentLocale === 'zh-TW' ||
      actualContentLocale === 'en'
        ? actualContentLocale
        : defaultLocale,
    actualContentLocale,
    fellBack: locale !== actualContentLocale,
    translationStatus,
  };
}

export async function getPostBySlugAndLocale(slug: string, locale: Locale) {
  const metaResult = await getPostMetaBySlugAndLocale(slug, locale);
  const entry = await getBlogIndexEntry(slug);
  if (!entry) {
    throw new Error(`No post found for slug: ${slug}`);
  }

  const parsed = await readVariantDocument(
    slug,
    metaResult.actualContentLocale,
    entry.access.mode === 'totp',
  );
  const meta = getVariantMeta(entry, metaResult.actualContentLocale, parsed.content);

  return {
    meta,
    content: parsed.content,
    requestedLocale: metaResult.requestedLocale,
    actualLocale: metaResult.actualLocale,
    actualContentLocale: metaResult.actualContentLocale,
    fellBack: metaResult.fellBack,
    translationStatus: metaResult.translationStatus,
  };
}

export async function getAllPostsForLocale(locale: Locale): Promise<BlogPostMeta[]> {
  const index = await fetchPublishedBlogIndex();
  const metas = index.posts.map((entry) => {
    const actualLocale = getPreferredVariantLocale(entry, locale);
    return sanitizeProtectedPostMeta(getVariantMetaFromIndex(entry, actualLocale));
  });

  return metas.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export async function getPublicPostsForLocale(locale: Locale): Promise<BlogPostMeta[]> {
  const posts = await getAllPostsForLocale(locale);
  return posts.filter((post) => post.access.mode === 'public');
}

export function getProtectedPostPublicMeta(meta: BlogPostMeta): BlogPostMeta {
  return sanitizeProtectedPostMeta(meta);
}
