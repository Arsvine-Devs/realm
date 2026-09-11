'use client';

import { useCallback, useRef } from 'react';

import { useNavigationRuntime } from './NavigationRuntime';

/**
 * Prefetch only after the user starts a navigation gesture. This keeps route
 * transitions warm without leaving speculative CSS preloads unused.
 */
export default function useNavigationIntentPrefetch() {
  const { prefetch } = useNavigationRuntime();
  const prefetchedUrlsRef = useRef(new Set<string>());

  return useCallback(
    (url: string) => {
      if (process.env.NODE_ENV !== 'production' || prefetchedUrlsRef.current.has(url)) {
        return;
      }

      prefetchedUrlsRef.current.add(url);
      void prefetch(url).catch(() => {
        prefetchedUrlsRef.current.delete(url);
      });
    },
    [prefetch],
  );
}
