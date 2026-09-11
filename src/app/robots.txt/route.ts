import { getSiteUrl } from '@/shared/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const baseUrl = getSiteUrl().replace(/\/$/, '');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
