import { useCallback, useEffect, useRef, useState } from 'react';

export function useDetailScrollReveal(
  rootRef: React.RefObject<HTMLElement | null>,
  depsKey: string = '',
) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setReady(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const index = Number(entry.target.getAttribute('data-reveal-idx'));
          if (Number.isNaN(index)) {
            return;
          }

          setVisible((prev) => new Set(prev).add(index));
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px', root: rootRef.current },
    );

    refs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [ready, rootRef, depsKey]);

  const setRef = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      refs.current[index] = element;
    },
    [],
  );

  return { visible, setRef };
}
