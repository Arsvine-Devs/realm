import { useMemo } from 'react';
import { classifyRoutePathname } from './contentHashNavigation';

export interface LayoutRouteMode {
  isHome: boolean;
  isContentPage: boolean;
  isStandalone: boolean;
  activeSection: 'home' | 'content';
}

export default function useLayoutRouteMode(
  pathname: string,
  forceHomeSection: boolean,
): LayoutRouteMode {
  return useMemo(() => {
    const routeKind = classifyRoutePathname(pathname);
    const isHome = routeKind === 'home';
    const isContentPage = routeKind === 'content';
    const isStandalone = routeKind === 'standalone';

    return {
      isHome,
      isContentPage,
      isStandalone,
      activeSection: forceHomeSection || isHome ? 'home' : 'content',
    };
  }, [forceHomeSection, pathname]);
}
