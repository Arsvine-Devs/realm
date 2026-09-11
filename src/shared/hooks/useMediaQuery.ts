import { useCallback, useSyncExternalStore } from 'react';

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => undefined;

      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => mediaQueryList.removeEventListener('change', onStoreChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return { isMobile, isTablet, isDesktop };
}

/**
 * prefers-reduced-motion: reduce 媒体查询。
 * 集中管理避免 7 处散落的 `matchMedia('(prefers-reduced-motion: reduce)')`。
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
