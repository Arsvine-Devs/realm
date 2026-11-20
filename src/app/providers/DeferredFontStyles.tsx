'use client';

import { useEffect } from 'react';

export default function DeferredFontStyles({ href }: { href: string }) {
  useEffect(() => {
    let cancelLoad: (() => void) | undefined;
    let stylesheet: HTMLLinkElement | undefined;
    const load = () => {
      stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      stylesheet.crossOrigin = 'anonymous';
      stylesheet.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.append(stylesheet);
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const idle = window.requestIdleCallback(load, { timeout: 1500 });
        cancelLoad = () => window.cancelIdleCallback(idle);
      } else {
        const timer = window.setTimeout(load, 0);
        cancelLoad = () => window.clearTimeout(timer);
      }
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      window.removeEventListener('load', schedule);
      cancelLoad?.();
      stylesheet?.remove();
    };
  }, [href]);

  return null;
}
