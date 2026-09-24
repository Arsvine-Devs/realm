'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TypewriterFramePart } from '@/shared/lib/typewriter';
import styles from './TypewriterFrame.module.scss';

interface TypewriterFrameProps {
  parts: readonly TypewriterFramePart[];
}

function sameWidths(left: Readonly<Record<number, number>>, right: Record<number, number>) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return rightKeys.every((key) => left[Number(key)] === right[Number(key)]);
}

export default function TypewriterFrame({ parts }: TypewriterFrameProps) {
  const [widths, setWidths] = useState<Record<number, number>>({});
  const measureRefs = useRef(new Map<number, HTMLSpanElement>());
  const frameRef = useRef<HTMLSpanElement>(null);
  const wordAnchorsKey = parts
    .map((part, index) => (part.kind === 'word' ? `${index}:${part.anchor}` : ''))
    .join('\u0000');

  const setMeasureRef = useCallback(
    (index: number) => (element: HTMLSpanElement | null) => {
      if (element) measureRefs.current.set(index, element);
      else measureRefs.current.delete(index);
    },
    [],
  );

  const measure = useCallback(() => {
    const next: Record<number, number> = {};
    measureRefs.current.forEach((element, index) => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) next[index] = width;
    });
    setWidths((current) => (sameWidths(current, next) ? current : next));
  }, []);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- width state is synchronized from measured DOM text.
    measure();
  }, [measure, wordAnchorsKey]);

  useEffect(() => {
    const frame = frameRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && frame ? new ResizeObserver(measure) : null;
    if (observer && frame) observer.observe(frame);

    const fonts = document.fonts;
    fonts?.addEventListener('loadingdone', measure);
    fonts?.addEventListener('loadingerror', measure);
    if (fonts) void fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener('loadingdone', measure);
      fonts?.removeEventListener('loadingerror', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <span ref={frameRef} className={styles.frame}>
      {parts.map((part, index) => {
        if (part.kind === 'literal') return <span key={`literal-${index}`}>{part.text}</span>;

        const width = widths[index];
        return (
          <span
            key={`word-${index}`}
            className={styles.wordBox}
            style={width ? { width: `${width}px` } : undefined}
          >
            <span ref={setMeasureRef(index)} className={styles.wordMeasure} aria-hidden="true">
              {part.anchor}
            </span>
            <span className={styles.wordVisual}>{part.text}</span>
          </span>
        );
      })}
    </span>
  );
}
