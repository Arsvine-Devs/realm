import { startTransition, useEffect, useState } from 'react';

import { useLayoutAnchors } from '@/features/navigation/model/LayoutAnchorsContext';
import {
  classifyRoutePathname,
  createContentHashNavigationRequest,
} from '@/features/navigation/model/contentHashNavigation';
import {
  setHudTypingOverlaySuppressed,
  setHudTypingRouteEnabled,
} from '@/shared/lib/hud-typing-visibility';
import { markCursorTargetsDirty } from '@/shared/lib/cursor-targets';

export function useWebglReadyLatch(animationsComplete: boolean) {
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    if (!animationsComplete || webglReady) return;
    const timeoutId = window.setTimeout(() => {
      startTransition(() => setWebglReady(true));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [animationsComplete, webglReady]);

  return webglReady;
}

export function useHudRouteVisibility(isStandalone: boolean) {
  useEffect(() => {
    setHudTypingRouteEnabled(!isStandalone);
    if (isStandalone) setHudTypingOverlaySuppressed(false);
  }, [isStandalone]);
}

export function useCursorTargetInvalidation(currentUrl: string, mainVisible: boolean) {
  useEffect(() => {
    markCursorTargetsDirty();
  }, [currentUrl]);

  useEffect(() => {
    if (mainVisible) markCursorTargetsDirty();
  }, [mainVisible]);
}

export function useContentHashAlignment(pathname: string, currentUrl: string) {
  const { align, cancel, isPending } = useLayoutAnchors();

  useEffect(() => {
    if (classifyRoutePathname(pathname) !== 'content') return;
    // App Router's usePathname() excludes the fragment; the browser URL is the
    // authoritative source for the current hash.
    const hash = window.location.hash.slice(1);
    if (!hash || isPending(hash)) return;
    const request = createContentHashNavigationRequest(hash);
    void align(request);
    return () => cancel(request.requestId);
  }, [align, cancel, currentUrl, isPending, pathname]);
}
