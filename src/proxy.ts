// Next.js discovers this App Router convention file from src/.
import { NextResponse, type NextRequest } from 'next/server';
import { geolocation } from '@vercel/functions';
import { isLocale, type Locale } from './app/i18n/config';
import {
  coerceCookieLocale,
  LOCALE_PATH_PATTERN,
  pickLocaleFromAcceptLanguage,
  shouldBypassLocaleProxy,
} from './shared/lib/locale-resolution';

// 客户端通过该 cookie 读取访客国家二字码（例如 'CN'）。仅供 UI 微调使用，
// 不参与权限/安全决策。Vercel 之外的环境会拿不到 country，按未知处理。
const GEO_COOKIE = 'GEO_COUNTRY';
const GEO_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h
// 客户端可用 ?_geo=US 临时覆盖 country（dev 调试 / 用户验证开了 VPN 后效果），
// ?_geo= 清空覆盖。覆盖也会写进 GEO_COUNTRY cookie，下次请求即生效。
const GEO_OVERRIDE_PARAM = '_geo';

// 注：早先版本通过 x-geo-country 请求头把 country 注入下游 SSR，目的是让"同一次刷新"
// 立即反映新 geo。但 SSG/ISR 页面在 Vercel CDN 共享缓存层会被多访客复用，
// 第一访客的 country 会污染整个缓存窗口（B 站等 region UI 漂移）。
// 现方案：proxy 只写 GEO_COUNTRY cookie；country 完全在根布局的内联脚本里
// （buildDocumentBootstrapScript）从 cookie 读到 <html dataset> —— hydration / CSS
// 应用前同步执行，单次刷新仍可立即生效，但不再污染 SSG 产物。

// 这些 path 前缀完全跳过 proxy，避免 favicon/API/asset 被 i18n 路由污染

/**
 * 解析当前请求的"有效 country"，优先级：
 *   1. URL ?_geo=XX 显式覆盖（dev 调试 / 用户切换 VPN 后强制刷新）
 *      - 空值 ?_geo= 表示清除覆盖
 *      - 非两位字母按未知处理，但仍会清除 cookie，避免被旧值卡住
 *   2. Vercel 边缘 geolocation() 实时探测
 *   3. 已有的 GEO_COUNTRY cookie（最后兜底）
 *
 * 返回的 country 永远是大写两位码或空串。
 */
function resolveCountry(request: NextRequest): {
  country: string;
  overrideAction: 'set' | 'clear' | 'none';
} {
  const overrideRaw = request.nextUrl.searchParams.get(GEO_OVERRIDE_PARAM);
  if (overrideRaw !== null) {
    const trimmed = overrideRaw.trim().toUpperCase();
    if (trimmed === '') return { country: '', overrideAction: 'clear' };
    if (/^[A-Z]{2}$/.test(trimmed)) return { country: trimmed, overrideAction: 'set' };
    // 无效值：忽略，按未覆盖处理
  }
  const geo = geolocation(request).country?.toUpperCase() ?? '';
  if (geo) return { country: geo, overrideAction: 'none' };
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
    return attachGeo(NextResponse.next(), request, country, overrideAction);
  }

  // 裸路径：根据 cookie / Accept-Language 决定目标 locale 并 301
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
  // 保留覆盖参数（?_geo=...），让 redirect 之后的 SSR 也走同一套覆盖逻辑
  const response = NextResponse.redirect(url, 308);
  response.headers.set('Vary', 'Cookie, Accept-Language');
  return attachGeo(response, request, country, overrideAction);
}

export const config = {
  // 匹配除 _next、API、静态文件以外的所有路径。文件级 bypass 在
  // shouldBypass 中按扩展名兜底，这里只排除常见前缀以减少 proxy 调用。
  matcher: ['/((?!_next|_vercel|api|.*\\.[a-z0-9]+$).*)'],
};
