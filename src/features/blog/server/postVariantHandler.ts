import { serialize } from 'next-mdx-remote/serialize';
import {
  getBlogPostEntry,
  getPostBySlugAndContentLocale,
  isBlogContentLocale,
  type BlogContentLocale,
} from './blog';
import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import { jsonResponse, parseCookieHeader } from '@/shared/server/http';

export default async function handler(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const localeParam = searchParams.get('locale') ?? '';
  const slugParam = searchParams.get('slug') ?? '';
  const responseInit = { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } };
  if (!localeParam || !slugParam) {
    return jsonResponse(
      { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Missing locale or slug.' } },
      { ...responseInit, status: 400 },
    );
  }

  if (!isBlogContentLocale(localeParam)) {
    return jsonResponse(
      { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid locale.' } },
      { ...responseInit, status: 400 },
    );
  }

  let entry: Awaited<ReturnType<typeof getBlogPostEntry>>;
  try {
    entry = await getBlogPostEntry(slugParam);
  } catch (error) {
    // 上游 GitHub 5xx / 超时 / 网络错误 → 502，让前端知道是临时问题（可重试）
    console.error('[post-variant] getBlogPostEntry failed:', error);
    return jsonResponse(
      {
        ok: false,
        error: { code: 'UPSTREAM_FAILED', message: 'Content repository unreachable.' },
      },
      { ...responseInit, status: 502 },
    );
  }
  if (!entry) {
    return jsonResponse(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Post not found.' } },
      { ...responseInit, status: 404 },
    );
  }

  if (entry.access.mode === 'totp') {
    const group = entry.access.group?.trim();
    if (!group) {
      return jsonResponse(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Access group not found.' } },
        { ...responseInit, status: 404 },
      );
    }

    if (
      !hasValidAccessGrant({ cookies: parseCookieHeader(request.headers.get('cookie')) }, group)
    ) {
      return jsonResponse(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Access grant required.' } },
        { ...responseInit, status: 403 },
      );
    }
  }

  try {
    const variant = await getPostBySlugAndContentLocale(
      slugParam,
      localeParam as BlogContentLocale,
    );
    const mdxSource = await serialize(variant.content);

    return jsonResponse(
      {
        ok: true,
        meta: variant.meta,
        mdxSource,
      },
      responseInit,
    );
  } catch (error) {
    // 区分"文章不存在"与"MDX 序列化失败" / "上游错误"。
    // 文章找不到（GitHub 404）走 404 + NOT_FOUND；其他（MDX 编译、序列化、5xx）走 500。
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('404')) {
      return jsonResponse(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Post variant not found.' } },
        { ...responseInit, status: 404 },
      );
    }
    console.error('[post-variant] variant fetch / serialize failed:', error);
    return jsonResponse(
      {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to render post variant.' },
      },
      { ...responseInit, status: 500 },
    );
  }
}
