import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { getPostBySlugAndLocale, getPublicPostsForLocale } from './blog';
import { getSiteUrl } from '@/shared/config/site';
import { rssLanguageMap, type Locale } from '@/shared/contracts/locale';
import { loadMessages } from '@/app/i18n/data';
import type { BlogPostMeta } from '../../../shared/types';

const SITE_URL = getSiteUrl();

// 发布稿缺少摘要时，截取正文中的一小段文字。
const FALLBACK_EXCERPT_LEN = 160;
const markdown = unified().use(remarkParse).use(remarkGfm);
const omittedNodes = new Set([
  'code',
  'inlineCode',
  'html',
  'footnoteDefinition',
  'footnoteReference',
]);
const blockContainers = new Set(['root', 'blockquote', 'list', 'listItem', 'table', 'tableRow']);

type MarkdownNode = { type: string; value?: string; children?: readonly MarkdownNode[] };

function visibleText(node: MarkdownNode): string {
  if (omittedNodes.has(node.type)) return '';
  if (node.type === 'text') return node.value ?? '';
  if (node.type === 'break') return ' ';
  return node.children?.map(visibleText).join(blockContainers.has(node.type) ? ' ' : '') ?? '';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 正文摘要保留 Markdown 链接文字，省略图片和代码。
 */
function buildFallbackExcerpt(content: string): string {
  if (!content) return '';
  const stripped = visibleText(markdown.parse(content)).replace(/\s+/g, ' ').trim();
  if (!stripped) return '';
  if (stripped.length <= FALLBACK_EXCERPT_LEN) return stripped;
  return `${stripped.slice(0, FALLBACK_EXCERPT_LEN)}…`;
}

/**
 * 返回 ISO 字符串对应的合法 Date；非法或缺失返回 null。
 * frontmatter 里的 `date` 可能是 'YYYY-MM-DD'，需要 new Date() 解析。
 */
function toValidDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** 文章的"最后修改时间"：优先 updated，回落到 date。 */
function getPostLastModified(meta: BlogPostMeta): Date | null {
  return toValidDate(meta.updated) ?? toValidDate(meta.date);
}

interface RssItemInput {
  meta: BlogPostMeta;
  description: string;
  lastModified: Date | null;
}

function generateRssXml(
  locale: Locale,
  items: RssItemInput[],
  siteTitle: string,
  siteDescription: string,
): string {
  const itemsXml = items
    .map(({ meta, description, lastModified }) => {
      const pubDateLine = lastModified
        ? `\n      <pubDate>${lastModified.toUTCString()}</pubDate>`
        : '';
      return `    <item>
      <title>${escapeXml(meta.title)}</title>
      <link>${SITE_URL}/${locale}/blog/${meta.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/${locale}/blog/${meta.slug}</guid>${pubDateLine}
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join('\n');

  // lastBuildDate：所有 item 中最新的 lastModified；全部缺失时省略字段，
  // 而不是退回 new Date()（避免 SSR 每次响应都给出新值）。
  const channelLastMod = items
    .map((it) => it.lastModified)
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((acc, d) => (acc === null || d.getTime() > acc.getTime() ? d : acc), null);
  const lastBuildLine = channelLastMod
    ? `\n    <lastBuildDate>${channelLastMod.toUTCString()}</lastBuildDate>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>${rssLanguageMap[locale]}</language>${lastBuildLine}
    <atom:link href="${SITE_URL}/${locale}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}

export async function buildLocaleRssResponse(locale: Locale) {
  const messages = await loadMessages(locale);

  // 按 updated ?? date 排序，新文章在前；与之前按 date 排序的行为基本一致，
  // 只有修订过的旧文会上浮 —— 这是预期效果。
  const posts = [...(await getPublicPostsForLocale(locale))].sort((a, b) => {
    const ta = getPostLastModified(a)?.getTime() ?? 0;
    const tb = getPostLastModified(b)?.getTime() ?? 0;
    return tb - ta;
  });

  const items: RssItemInput[] = await Promise.all(
    posts.map(async (meta) => {
      // 发布稿缺少摘要时才读取正文。
      let description = meta.excerpt;
      if (!description) {
        try {
          const { content } = await getPostBySlugAndLocale(meta.slug, locale);
          description = buildFallbackExcerpt(content);
        } catch {
          description = '';
        }
      }
      return {
        meta,
        description,
        lastModified: getPostLastModified(meta),
      };
    }),
  );

  const siteMessages =
    (messages.pages as Record<string, { title?: string; rssDescription?: string }>)?.site ?? {};
  const xml = generateRssXml(
    locale,
    items,
    siteMessages.title ?? 'ARSVINE REALM',
    siteMessages.rssDescription ?? '',
  );

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
