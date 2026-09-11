import { useMemo } from 'react';
import { getRouteTemplate } from './NavigationRuntime';

type RouteLoadingKind = null | 'tweets' | 'blog';
type RouteLoadingPresentation = 'default' | 'standalone';

interface RouteLoadingState {
  kind: RouteLoadingKind;
  presentation: RouteLoadingPresentation;
}

const TWEETS_ROUTE_RE = /^\/[A-Za-z-]+\/tweets\/?$/;
const BLOG_DETAIL_ROUTE_RE = /^\/[A-Za-z-]+\/blog\/[^/]+\/?$/;

// 与 useLayoutRouteMode 保持一致：这些 pathname 模板下 LeftPanel 会被 standaloneHide
// 隐藏，整页布局变成 detail-only。loading overlay 在这些源页面跳转时也应满屏，
// 否则卡片会出现在右侧内容栏，但左侧空白区其实是没有 nav/avatar 的，看起来很奇怪。
function isStandalonePathname(pathname: string): boolean {
  const routeTemplate = getRouteTemplate(pathname);
  return (
    routeTemplate.startsWith('/[locale]/web/') ||
    routeTemplate.startsWith('/[locale]/life/') ||
    routeTemplate.startsWith('/[locale]/blog/')
  );
}

export default function useRouteLoadingKind(
  pathname: string,
  targetUrl: string | null = null,
): RouteLoadingState {
  return useMemo(() => {
    if (!targetUrl) return { kind: null, presentation: 'default' };
    const path = targetUrl.split('?')[0]?.split('#')[0] ?? targetUrl;
    const presentation: RouteLoadingPresentation = isStandalonePathname(pathname)
      ? 'standalone'
      : 'default';
    if (TWEETS_ROUTE_RE.test(path)) return { kind: 'tweets', presentation };
    if (BLOG_DETAIL_ROUTE_RE.test(path)) return { kind: 'blog', presentation };
    return { kind: null, presentation: 'default' };
  }, [pathname, targetUrl]);
}
