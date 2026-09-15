import type { ContentBlogIndex, ContentTweetIndexItem } from './types';

const FETCH_TIMEOUT_MS = 8000;
const PUBLIC_CONTENT_REVALIDATE_SECONDS = 300;
const PROTECTED_SCOPE = 'content:protected:read';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

type ServiceToken = {
  accessToken: string;
  expiresAt: number;
};

let serviceToken: ServiceToken | null = null;

class ContentServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ContentServiceError';
  }
}

const AUTH_TOKEN_PATH = '/api/auth/oauth2/token';

function getBaseUrl() {
  const value = process.env.CONTENT_BASE_URL?.trim();
  if (!value) throw new ContentServiceError('Content service is not configured.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ContentServiceError('CONTENT_BASE_URL must be an absolute URL.');
  }
  if (url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new ContentServiceError('CONTENT_BASE_URL must use HTTPS outside localhost.');
  }
  return url.toString().replace(/\/$/, '');
}

function getProtectedContentAuthConfig() {
  const issuer = process.env.AUTH_ISSUER?.trim();
  const clientId = process.env.CONTENT_SERVICE_CLIENT_ID?.trim();
  const clientSecret = process.env.CONTENT_SERVICE_CLIENT_SECRET?.trim();
  if (!issuer) {
    throw new ContentServiceError('AUTH_ISSUER is not configured.');
  }
  if (!clientId || !clientSecret) {
    throw new ContentServiceError('Protected content service credentials are not configured.');
  }
  let issuerUrl: URL;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new ContentServiceError('AUTH_ISSUER must be an absolute URL.');
  }
  if (issuerUrl.protocol !== 'https:' && !LOOPBACK_HOSTS.has(issuerUrl.hostname)) {
    throw new ContentServiceError('AUTH_ISSUER must use HTTPS outside localhost.');
  }
  const tokenUrl = new URL(AUTH_TOKEN_PATH, issuerUrl).toString();
  return { tokenUrl, clientId, clientSecret };
}

async function getProtectedContentToken() {
  if (serviceToken && serviceToken.expiresAt > Date.now() + 30_000) {
    return serviceToken.accessToken;
  }

  const { tokenUrl, clientId, clientSecret } = getProtectedContentAuthConfig();
  const resource = new URL(getBaseUrl()).origin;
  const clientCredentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${clientCredentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: PROTECTED_SCOPE,
      resource,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;
  if (!response.ok || typeof body?.access_token !== 'string') {
    throw new ContentServiceError(
      body?.error_description ?? body?.error ?? `Auth service returned ${response.status}.`,
      response.status,
    );
  }
  serviceToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in ?? 300) * 1000,
  };
  return serviceToken.accessToken;
}

async function fetchContentJson<T>(
  path: string,
  options: { protected?: boolean } = {},
  retry = true,
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.protected) {
    headers.set('Authorization', `Bearer ${await getProtectedContentToken()}`);
  }
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...(options.protected
      ? { cache: 'no-store' as const }
      : { next: { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS } }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  if (options.protected && response.status === 401 && retry) {
    serviceToken = null;
    return fetchContentJson<T>(path, options, false);
  }
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

export async function fetchPublishedPostVariant(
  slug: string,
  locale: string,
  options: { protected?: boolean } = {},
) {
  const data = await fetchContentJson<{ variant: PublishedPostVariant }>(
    `${options.protected ? '/v1/internal' : '/v1'}/posts/${encodeURIComponent(slug)}/variants/${encodeURIComponent(locale)}`,
    options,
  );
  if (!data.variant || typeof data.variant.bodyMdx !== 'string') {
    throw new ContentServiceError('Published content variant is invalid.');
  }
  return data.variant;
}

export async function fetchPublishedTweetIndex() {
  return fetchContentJson<{ months: ContentTweetIndexItem[] }>('/v1/tweets/months');
}

export async function fetchPublishedTweetMonth(month: string) {
  return fetchContentJson<{ month: string; tweets: unknown[] }>(
    `/v1/tweets/months/${encodeURIComponent(month)}`,
  );
}
