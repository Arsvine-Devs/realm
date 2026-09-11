import { getPublicPostsForLocale } from '@/features/blog/server/blog';
import { getSiteUrl } from '@/shared/config/site';
import { loadLife, loadProjects } from '@/app/i18n/data';
import { defaultLocale, locales } from '@/app/i18n/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const staticPaths = ['/', '/content', '/friends', '/tweets', '/copyright'];
const siteUrl = getSiteUrl();
const lang = (locale: string) =>
  locale === 'zh-CN' ? 'zh-Hans' : locale === 'zh-TW' ? 'zh-Hant' : 'en';
const href = (locale: string, path: string) => `${siteUrl}/${locale}${path === '/' ? '' : path}`;
const alternates = (path: string) =>
  [
    ...locales.map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${lang(locale)}" href="${href(locale, path)}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${href(defaultLocale, path)}"/>`,
  ].join('\n');
const entry = (
  locale: string,
  path: string,
  priority: string,
  changefreq: string,
  lastmod?: string,
) =>
  `  <url>\n    <loc>${href(locale, path)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${alternates(path)}\n  </url>`;

export async function GET() {
  const entries: string[] = [];
  for (const path of staticPaths)
    for (const locale of locales) {
      const priority =
        path === '/'
          ? '1.0'
          : path === '/content'
            ? '0.8'
            : path === '/tweets'
              ? '0.7'
              : path === '/friends'
                ? '0.5'
                : '0.3';
      const changefreq =
        path === '/' || path === '/content'
          ? 'weekly'
          : path === '/tweets' || path === '/friends'
            ? 'monthly'
            : 'yearly';
      entries.push(entry(locale, path, priority, changefreq));
    }
  for (const locale of locales) {
    for (const post of await getPublicPostsForLocale(locale)) {
      const date = post.updated || post.date;
      entries.push(
        entry(
          locale,
          `/blog/${post.slug}`,
          '0.7',
          'monthly',
          date ? new Date(date).toISOString().slice(0, 10) : undefined,
        ),
      );
    }
    for (const project of loadProjects(locale).webProjects)
      entries.push(entry(locale, `/web/${project.id}`, '0.6', 'monthly'));
    const life = loadLife(locale);
    for (const item of [...life.gameData, ...life.travelData, ...life.otherData])
      entries.push(entry(locale, `/life/${item.id}`, '0.6', 'monthly'));
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    },
  );
}
