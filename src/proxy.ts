// Next.js discovers this App Router convention file from src/.
import { NextResponse, type NextRequest } from 'next/server';
import { isProxyTrusted } from './shared/server/http';
import { readEnv } from './shared/config/env-provider';
import { isLocale, type Locale } from './app/i18n/config';
import { ROUTE_LOCALE_HEADER } from './shared/contracts/locale';
import {
  coerceCookieLocale,
  LOCALE_PATH_PATTERN,
  pickLocaleFromAcceptLanguage,
  shouldBypassLocaleProxy,
} from './shared/lib/locale-resolution';

// The browser reads this country hint for region-specific links.
const GEO_COOKIE = 'GEO_COUNTRY';
const GEO_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h
const GEO_OVERRIDE_PARAM = '_geo';

// Store location in a response cookie so SSR and ISR remain independent of individual visitors.
function resolveCountry(request: NextRequest): {
  country: string;
  overrideAction: 'set' | 'clear' | 'none';
} {
  const overrideRaw =
    process.env.NODE_ENV === 'production'
      ? null
      : request.nextUrl.searchParams.get(GEO_OVERRIDE_PARAM);
  if (overrideRaw !== null) {
    const trimmed = overrideRaw.trim().toUpperCase();
    if (trimmed === '') return { country: '', overrideAction: 'clear' };
    if (/^[A-Z]{2}$/.test(trimmed)) return { country: trimmed, overrideAction: 'set' };
    // 无效值：忽略，按未覆盖处理
  }
  const geo = isProxyTrusted() ? (request.headers.get('cf-ipcountry')?.toUpperCase() ?? '') : '';
  if (/^[A-Z]{2}$/.test(geo) && geo !== 'XX') return { country: geo, overrideAction: 'none' };
  const cookie = request.cookies.get(GEO_COOKIE)?.value?.toUpperCase() ?? '';
  return { country: cookie, overrideAction: 'none' };
}

function attachGeo(
  response: NextResponse,
  request: NextRequest,
  country: string,
  overrideAction: 'set' | 'clear' | 'none',
): NextResponse {
  const existingCookie = request.cookies.get(GEO_COOKIE)?.value ?? '';
  if (overrideAction === 'clear') {
    if (existingCookie) {
      response.cookies.set(GEO_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' });
    }
  } else if (country && country !== existingCookie) {
    response.cookies.set(GEO_COOKIE, country, {
      path: '/',
      maxAge: GEO_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypassLocaleProxy(pathname)) {
    return NextResponse.next();
  }

  const { country, overrideAction } = resolveCountry(request);

  // 判断 pathname 第一段是否已经是 locale
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isLocale(firstSegment)) {
    // 已是合法 locale 路径：直接放行，response 上写 GEO_COUNTRY cookie，
    // 客户端 bootstrap 脚本读 cookie 写 <html dataset>。SSR 不再注入 country，
    // 避免 SSG/ISR 共享缓存被首访客 country 污染。
    const headers = new Headers(request.headers);
    headers.set(ROUTE_LOCALE_HEADER, firstSegment);
    headers.delete('x-arsvine-nonce');
    let scriptPolicy: string | undefined;
    if (readEnv('REALM_CSP_SCRIPT_REPORT_ONLY') === '1') {
      const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
      scriptPolicy = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'report-sample'; worker-src 'self' blob:`;
      headers.set('x-arsvine-nonce', nonce);
      // Next uses the request policy to attach the nonce to its rendered scripts.
      headers.set('Content-Security-Policy', scriptPolicy);
    } else {
      headers.delete('Content-Security-Policy');
    }
    const response = NextResponse.next({ request: { headers } });
    if (scriptPolicy) response.headers.set('Content-Security-Policy-Report-Only', scriptPolicy);
    return attachGeo(response, request, country, overrideAction);
  }

  // The visitor's cookie or language preferences determine the temporary redirect.
  const cookieLocale = coerceCookieLocale(request.cookies.get('NEXT_LOCALE')?.value);
  const targetLocale: Locale = cookieLocale
    ? cookieLocale
    : pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));

  // 若第一段长得像 locale 但不在受支持列表（如 /fr/web/1），剥掉它再前置目标 locale，
  // 避免拼出 /en/fr/web/1 这种 404 路径。
  const rest =
    firstSegment && LOCALE_PATH_PATTERN.test(firstSegment)
      ? '/' + segments.slice(1).join('/')
      : pathname;

  const url = request.nextUrl.clone();
  url.pathname = `/${targetLocale}${rest === '/' ? '' : rest}`;
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Accept-Language');
  return attachGeo(response, request, country, overrideAction);
}

export const config = {
  // 匹配除 _next、API、静态文件以外的所有路径。文件级 bypass 在
  // shouldBypass 中按扩展名兜底，这里只排除常见前缀以减少 proxy 调用。
  matcher: ['/((?!_next|api|media(?:/|$)|.*\\.[a-z0-9]+$).*)'],
};
