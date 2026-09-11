import { useMemo } from 'react';
import { getRouteTemplate } from './NavigationRuntime';

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
    const routeTemplate = getRouteTemplate(pathname);
    const isHome = routeTemplate === '/[locale]';
    const isContentPage = routeTemplate === '/[locale]/content';
    const isStandalone =
      routeTemplate.startsWith('/[locale]/web/') ||
      routeTemplate.startsWith('/[locale]/life/') ||
      routeTemplate.startsWith('/[locale]/blog/');

    return {
      isHome,
      isContentPage,
      isStandalone,
      activeSection: forceHomeSection || isHome ? 'home' : 'content',
    };
  }, [forceHomeSection, pathname]);
}
