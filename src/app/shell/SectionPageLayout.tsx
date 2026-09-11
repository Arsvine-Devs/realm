'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import styles from '../styles/Shell.module.scss';
import { useLocalePageStateStore } from '@/features/navigation/model/LocalePageState';

export default function SectionPageLayout({ children }: { children: ReactNode }) {
  const pageStateStore = useLocalePageStateStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const restoreFrameRef = useRef<number | null>(null);

  const setContainer = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (!element) return;

      const savedScrollTop = pageStateStore.read<number>('section.scroll-top') ?? 0;
      restoreFrameRef.current = window.requestAnimationFrame(() => {
        element.scrollTop = Math.min(
          savedScrollTop,
          Math.max(0, element.scrollHeight - element.clientHeight),
        );
        restoreFrameRef.current = null;
      });
    },
    [pageStateStore],
  );

  const handleScroll = useCallback(() => {
    pageStateStore.write('section.scroll-top', containerRef.current?.scrollTop ?? 0);
  }, [pageStateStore]);

  useEffect(
    () => () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
    },
    [],
  );

  return (
    <div
      ref={setContainer}
      className={styles.contentWrapper}
      style={{ pointerEvents: 'auto' }}
      onScroll={handleScroll}
    >
      {children}
    </div>
  );
}
