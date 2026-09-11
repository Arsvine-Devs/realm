export type RouteKind = 'home' | 'content' | 'standalone' | 'auxiliary';
export type ContentHashTransitionMode = 'same-page' | 'cross-page' | 'not-content-hash';
export type NavigationTransitionPlan =
  | 'samePageHash'
  | 'homeForwardDesktop'
  | 'homeForwardMobile'
  | 'crossPageHash'
  | 'returnHomeDesktop'
  | 'returnHomeMobile'
  | 'blogDetailFade'
  | 'standardSlide';

export interface ContentHashNavigationRequest {
  hash: string;
  requestId: string;
}

let contentHashNavigationRequestCounter = 0;

export function getContentSectionHashFromUrl(url: string): string | null {
  if (!url.includes('#')) {
    return null;
  }

  const [pathPart, hashPart = ''] = url.split('#');
  const pathWithoutQuery = pathPart.split('?')[0] ?? pathPart;
  const segments = pathWithoutQuery.split('/').filter(Boolean);

  if (segments.length !== 2 || segments[1] !== 'content' || hashPart.length === 0) {
    return null;
  }

  return decodeURIComponent(hashPart);
}

export function classifyRoutePathname(pathname: string): RouteKind {
  const segments = pathname.split('/').filter(Boolean);
  const routeSegments = segments.slice(1);

  if (segments.length === 1) {
    return 'home';
  }

  if (routeSegments.length === 1 && routeSegments[0] === 'content') {
    return 'content';
  }

  if (routeSegments[0] === 'web' || routeSegments[0] === 'life' || routeSegments[0] === 'blog') {
    return 'standalone';
  }

  return 'auxiliary';
}

export function resolveContentHashTransitionMode(
  sourcePathname: string,
  targetUrl: string,
): ContentHashTransitionMode {
  if (!getContentSectionHashFromUrl(targetUrl)) {
    return 'not-content-hash';
  }

  return classifyRoutePathname(sourcePathname) === 'content' ? 'same-page' : 'cross-page';
}

function getTargetSegments(url: string) {
  try {
    return new URL(url, 'https://arsvine.local').pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

export function isHomeUrl(url: string) {
  return getTargetSegments(url).length === 1;
}

export function isBlogDetailUrl(url: string) {
  const segments = getTargetSegments(url);
  return segments.length === 3 && segments[1] === 'blog' && segments[2].length > 0;
}

export function resolveNavigationTransitionPlan({
  sourcePathname,
  targetUrl,
  mobile,
}: {
  sourcePathname: string;
  targetUrl: string;
  mobile: boolean;
}): NavigationTransitionPlan {
  const contentHashMode = resolveContentHashTransitionMode(sourcePathname, targetUrl);
  if (contentHashMode === 'same-page') return 'samePageHash';
  const sourceKind = classifyRoutePathname(sourcePathname);
  const goingHome = isHomeUrl(targetUrl);
  if (sourceKind === 'home' && !goingHome)
    return mobile ? 'homeForwardMobile' : 'homeForwardDesktop';
  if (sourceKind !== 'home' && contentHashMode === 'cross-page') return 'crossPageHash';
  if (sourceKind !== 'home' && goingHome) return mobile ? 'returnHomeMobile' : 'returnHomeDesktop';
  if (isBlogDetailUrl(targetUrl)) return 'blogDetailFade';
  return 'standardSlide';
}

export function createContentHashNavigationRequest(hash: string): ContentHashNavigationRequest {
  contentHashNavigationRequestCounter += 1;
  return {
    hash,
    requestId: `content-hash-${contentHashNavigationRequestCounter}`,
  };
}
