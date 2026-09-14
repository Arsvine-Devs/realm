import type { ContentBlogIndex } from './types';
import type { TweetIndexItem, TweetItem } from '@/features/tweets/model/types';

const FETCH_TIMEOUT_MS = 8000;

export class ContentServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ContentServiceError';
  }
}

function getBaseUrl() {
  const value = process.env.CONTENT_BASE_URL?.trim();
  if (!value) throw new ContentServiceError('Content service is not configured.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ContentServiceError('CONTENT_BASE_URL must be an absolute URL.');
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new ContentServiceError('CONTENT_BASE_URL must use HTTPS outside localhost.');
  }
  return url.toString().replace(/\/$/, '');
}

export function hasContentServiceConfig() {
  return Boolean(process.env.CONTENT_BASE_URL?.trim());
}

async function fetchContentJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  if (!response.ok) {
    throw new ContentServiceError(
      body?.error?.message ?? `Content service returned ${response.status}.`,
      response.status,
      body?.error?.code,
    );
  }
  return body as T;
}

export async function fetchPublishedBlogIndex(): Promise<ContentBlogIndex> {
  const data = await fetchContentJson<{
    publishedAt: string;
    posts: ContentBlogIndex['posts'];
  }>('/v1/posts');
  return { version: 1, updatedAt: data.publishedAt, posts: data.posts };
}

export type PublishedPostVariant = {
  slug: string;
  locale: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  date?: string;
  updatedAt?: string;
  originLocale?: string;
  access?: { mode: 'public' | 'totp'; group?: string };
  bodyMdx: string;
};

export async function fetchPublishedPostVariant(slug: string, locale: string) {
  const data = await fetchContentJson<{ variant: PublishedPostVariant }>(
    `/v1/posts/${encodeURIComponent(slug)}/variants/${encodeURIComponent(locale)}`,
  );
  if (!data.variant || typeof data.variant.bodyMdx !== 'string') {
    throw new ContentServiceError('Published content variant is invalid.');
  }
  return data.variant;
}

export async function fetchPublishedTweetIndex() {
  return fetchContentJson<{ months: TweetIndexItem[] }>('/v1/tweets/months');
}

export async function fetchPublishedTweetMonth(month: string) {
  return fetchContentJson<{ month: string; tweets: TweetItem[] }>(
    `/v1/tweets/months/${encodeURIComponent(month)}`,
  );
}
