import { defaultLocale, isLocale, type Locale } from '@/shared/contracts/locale';

const BYPASS_PREFIXES = [
  '/api',
  '/_next',
  '/_vercel',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons',
  '/fonts',
  '/images',
  '/decor',
  '/music',
  '/robots.txt',
  '/sitemap.xml',
  '/rss.xml',
];

export const LOCALE_PATH_PATTERN = /^[a-z]{2}(-[A-Za-z]{2,4})?$/;

export function shouldBypassLocaleProxy(pathname: string): boolean {
  return (
    BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export function pickLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const tags = acceptLanguage
    .split(',')
    .flatMap((part) => {
      const [tag, qStr] = part.trim().split(';q=');
      const q = qStr === undefined ? 1 : Number(qStr);
      if (!tag || !Number.isFinite(q) || q <= 0 || q > 1) return [];
      return [{ tag: tag.toLowerCase(), q }];
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (tag.startsWith('en')) return 'en';
    if (tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-hant' || tag.startsWith('zh-hant'))
      return 'zh-TW';
    if (
      tag === 'zh' ||
      tag.startsWith('zh-cn') ||
      tag.startsWith('zh-hans') ||
      tag.startsWith('zh')
    )
      return 'zh-CN';
  }
  return defaultLocale;
}

export function coerceCookieLocale(value: string | undefined): Locale | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (isLocale(normalized)) return normalized;
  switch (normalized.toLowerCase()) {
    case 'zh':
    case 'zh-cn':
    case 'zh-hans':
      return 'zh-CN';
    case 'zh-tw':
    case 'zh-hk':
    case 'zh-hant':
      return 'zh-TW';
    case 'en':
    case 'en-us':
    case 'en-gb':
      return 'en';
    default:
      return undefined;
  }
}
