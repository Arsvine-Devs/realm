'use client';

import {
  createContext,
  createElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Locale } from '@/shared/contracts/locale';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import {
  createTypewriterSequence,
  getTypewriterStepAtProgress,
  splitTypewriterText,
  TYPEWRITER_FRAME_INTERVAL_MS,
  type TypewriterFramePart,
} from '@/shared/lib/typewriter';
import TypewriterFrame from '@/shared/ui/TypewriterFrame';
import type { BlogContentLocale } from '../../server/blog';
import styles from '../../styles/MDXContent.module.scss';
import Spoiler from './Spoiler';

type RevealCallback = (animate: boolean) => void;

interface BlogContentRevealContextValue {
  locale: BlogContentLocale;
  reducedMotion: boolean;
  supportsIntersectionObserver: boolean;
  register: (element: HTMLElement, reveal: RevealCallback) => () => void;
}

const fallbackContext: BlogContentRevealContextValue = {
  locale: 'zh-CN',
  reducedMotion: true,
  supportsIntersectionObserver: false,
  register: () => () => undefined,
};

const BlogContentRevealContext = createContext(fallbackContext);
const ScrambleBlockNestingContext = createContext(false);

interface BlogContentRevealProviderProps {
  bodyRef: RefObject<HTMLDivElement | null>;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  locale: BlogContentLocale;
  children: ReactNode;
}

export function BlogContentRevealProvider({
  bodyRef,
  scrollRootRef,
  enabled,
  locale,
  children,
}: BlogContentRevealProviderProps) {
  const reducedMotion = useReducedMotion();
  const supportsIntersectionObserver = typeof IntersectionObserver !== 'undefined';
  const registrationsRef = useRef(new Map<HTMLElement, RevealCallback>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observationStartedRef = useRef(false);

  const register = useCallback((element: HTMLElement, reveal: RevealCallback) => {
    registrationsRef.current.set(element, reveal);
    if (observerRef.current && observationStartedRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (registrationsRef.current.get(element) === reveal) {
        registrationsRef.current.delete(element);
      }
      observerRef.current?.unobserve(element);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const body = bodyRef.current;
    const root = scrollRootRef.current;
    if (!body || !root) return undefined;

    const directChildren = Array.from(body.children) as HTMLElement[];
    const revealDirectChild = (element: HTMLElement, index: number) => {
      element.style.transitionDelay = `${index * 0.07}s`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      element.addEventListener(
        'transitionend',
        () => {
          element.style.transitionDelay = '';
          element.style.transform = 'none';
        },
        { once: true },
      );
    };

    if (!supportsIntersectionObserver) {
      directChildren.forEach(revealDirectChild);
      registrationsRef.current.forEach((reveal) => reveal(false));
      registrationsRef.current.clear();
      return undefined;
    }

    const directChildSet = new Set(directChildren);
    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((entry) => entry.isIntersecting);
        entering
          .filter((entry) => directChildSet.has(entry.target as HTMLElement))
          .forEach((entry, index) => revealDirectChild(entry.target as HTMLElement, index));

        entering.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const reveal = registrationsRef.current.get(element);
          if (reveal) {
            registrationsRef.current.delete(element);
            reveal(!reducedMotion);
          }
          observer.unobserve(element);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px', root },
    );

    observerRef.current = observer;
    observationStartedRef.current = false;

    const timer = window.setTimeout(() => {
      observationStartedRef.current = true;
      new Set([...directChildren, ...registrationsRef.current.keys()]).forEach((element) => {
        observer.observe(element);
      });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      observationStartedRef.current = false;
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [bodyRef, enabled, reducedMotion, scrollRootRef, supportsIntersectionObserver]);

  const contextValue = useMemo(
    () => ({ locale, reducedMotion, supportsIntersectionObserver, register }),
    [locale, reducedMotion, register, supportsIntersectionObserver],
  );

  return (
    <BlogContentRevealContext.Provider value={contextValue}>
      {children}
    </BlogContentRevealContext.Provider>
  );
}

type BlogScrambleBlockTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'li' | 'p';

interface BlogScrambleBlockProps {
  as: BlogScrambleBlockTag;
  className?: string;
  children?: ReactNode;
}

function extractScrambleText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractScrambleText).join('');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  if (node.type === Spoiler) return '';
  if (node.type === BlogScrambleBlock) return extractScrambleText(node.props.children);

  if (
    typeof node.type === 'string' &&
    ['pre', 'img', 'picture', 'video', 'audio', 'iframe', 'svg', 'object', 'embed'].includes(
      node.type,
    )
  ) {
    return '';
  }
  if (
    typeof node.type === 'function' &&
    (node.type as { blogContentScrambleExcluded?: boolean }).blogContentScrambleExcluded
  ) {
    return '';
  }

  return extractScrambleText(node.props.children);
}

function StaticMdxBlock({ as, className, children }: BlogScrambleBlockProps) {
  return createElement(as, className ? { className } : null, children);
}

const SCRAMBLE_MEASUREMENT_EXCLUDED_SELECTOR =
  '[data-spoiler-state], pre, img, picture, video, audio, iframe, svg, object, embed, rt, rp';

interface ScrambleRect {
  offset: number;
  top: number;
}

function measureScrambleLineBreaks(
  root: HTMLElement,
  text: string,
  parts: readonly TypewriterFramePart[],
): readonly number[] | undefined {
  if (
    typeof document === 'undefined' ||
    typeof document.createTreeWalker !== 'function' ||
    typeof NodeFilter === 'undefined'
  ) {
    return undefined;
  }

  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return undefined;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const rects: ScrambleRect[] = [];
  let textOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    const value = textNode.data;
    const graphemes = splitTypewriterText(value);

    if (!parent?.closest(SCRAMBLE_MEASUREMENT_EXCLUDED_SELECTOR) && graphemes) {
      let localOffset = 0;
      graphemes.forEach((grapheme) => {
        const start = localOffset;
        const end = start + grapheme.length;
        localOffset = end;
        range.setStart(textNode, start);
        range.setEnd(textNode, end);
        const rect = Array.from(range.getClientRects()).find(
          (candidate) => candidate.width > 0 && candidate.height > 0,
        );
        if (rect) rects.push({ offset: textOffset + start, top: rect.top });
      });
    }

    if (!parent?.closest(SCRAMBLE_MEASUREMENT_EXCLUDED_SELECTOR)) {
      textOffset += value.length;
    }
    node = walker.nextNode();
  }

  if (textOffset !== text.length || rects.length === 0) return undefined;

  const lineByOffset = new Map<number, number>();
  let line = -1;
  let previousTop = Number.NaN;
  rects.forEach(({ offset, top }) => {
    if (!Number.isFinite(previousTop) || Math.abs(top - previousTop) > 2) {
      line += 1;
      previousTop = top;
    }
    lineByOffset.set(offset, line);
  });

  const getPartLine = (start: number, end: number) => {
    const direct = rects.find((rect) => rect.offset >= start && rect.offset < end);
    if (direct) return lineByOffset.get(direct.offset);

    const following = rects.find((rect) => rect.offset >= end);
    if (following) return lineByOffset.get(following.offset);

    const preceding = [...rects].reverse().find((rect) => rect.offset < start);
    return preceding ? lineByOffset.get(preceding.offset) : undefined;
  };

  const lineBreaks: number[] = [];
  let offset = 0;
  let lastContentLine: number | undefined;
  parts.forEach((part, index) => {
    const partText = part.kind === 'word' ? part.anchor : part.text;
    const start = offset;
    offset += partText.length;
    const partLine = getPartLine(start, offset);
    const whitespaceOnly = part.kind === 'literal' && /^\s*$/u.test(part.text);

    if (
      partLine !== undefined &&
      lastContentLine !== undefined &&
      partLine > lastContentLine &&
      !whitespaceOnly
    ) {
      lineBreaks.push(index);
    }
    if (!whitespaceOnly && partLine !== undefined) lastContentLine = partLine;
  });

  return lineBreaks;
}

export function BlogScrambleBlock(props: BlogScrambleBlockProps) {
  const nested = useContext(ScrambleBlockNestingContext);
  return nested ? <StaticMdxBlock {...props} /> : <AnimatedBlogScrambleBlock {...props} />;
}

function AnimatedBlogScrambleBlock({ as, className, children }: BlogScrambleBlockProps) {
  const { locale, reducedMotion, supportsIntersectionObserver, register } =
    useContext(BlogContentRevealContext);
  const text = useMemo(() => extractScrambleText(children), [children]);
  const typewriterLocale: Locale = locale === 'zh-TW' ? 'zh-TW' : 'zh-CN';
  const sequence = useMemo(
    () =>
      text.trim() ? createTypewriterSequence(text, 'scramble', { locale: typewriterLocale }) : null,
    [text, typewriterLocale],
  );
  const [phase, setPhase] = useState<'waiting' | 'scrambling' | 'handoff' | 'complete'>(
    supportsIntersectionObserver && !reducedMotion ? 'waiting' : 'complete',
  );
  const [frameParts, setFrameParts] = useState<readonly TypewriterFramePart[]>([]);
  const [lineBreaks, setLineBreaks] = useState<readonly number[] | undefined>();
  const timerRef = useRef<number | null>(null);
  const blockRef = useRef<HTMLElement | null>(null);
  const richContentRef = useRef<HTMLElement | null>(null);
  const setBlockRef = useCallback((element: HTMLElement | null) => {
    blockRef.current = element;
  }, []);
  const setRichContentRef = useCallback((element: HTMLElement | null) => {
    richContentRef.current = element;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reveal = useCallback(
    (animate: boolean) => {
      clearTimer();
      if (!animate || !sequence || sequence.stepCount === 0) {
        setPhase('complete');
        return;
      }

      const startedAt = Date.now();
      setFrameParts(sequence.framePartsAt(0));
      setPhase('scrambling');

      const animateFrame = () => {
        const elapsed = Math.min(sequence.durationMs, Date.now() - startedAt);
        const step = getTypewriterStepAtProgress(sequence, elapsed / sequence.durationMs);
        setFrameParts(sequence.framePartsAt(step));

        if (elapsed >= sequence.durationMs) {
          setFrameParts(sequence.framePartsAt(sequence.stepCount));
          setPhase('handoff');
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            setPhase('complete');
          }, 240);
          return;
        }

        timerRef.current = window.setTimeout(
          animateFrame,
          Math.min(TYPEWRITER_FRAME_INTERVAL_MS, sequence.durationMs - elapsed),
        );
      };

      timerRef.current = window.setTimeout(animateFrame, TYPEWRITER_FRAME_INTERVAL_MS);
    },
    [clearTimer, sequence],
  );

  useEffect(() => {
    const element = blockRef.current;
    if (!element || !supportsIntersectionObserver) return undefined;
    return register(element, reveal);
  }, [register, reveal, supportsIntersectionObserver]);

  const measureLineBreaks = useCallback(() => {
    const element = richContentRef.current;
    const finalParts = sequence?.framePartsAt(sequence.stepCount);
    const next =
      element && sequence && finalParts
        ? measureScrambleLineBreaks(element, text, finalParts)
        : undefined;

    setLineBreaks((current) => {
      if (
        current?.length === next?.length &&
        current?.every((value, index) => value === next?.[index])
      ) {
        return current;
      }
      return next;
    });
  }, [sequence, text]);

  useLayoutEffect(() => {
    measureLineBreaks();
    const element = richContentRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && element
        ? new ResizeObserver(measureLineBreaks)
        : null;
    if (observer && element) observer.observe(element);

    const fonts = document.fonts;
    fonts?.addEventListener('loading', measureLineBreaks);
    fonts?.addEventListener('loadingdone', measureLineBreaks);
    fonts?.addEventListener('loadingerror', measureLineBreaks);
    if (fonts) void fonts.ready.then(measureLineBreaks);
    window.addEventListener('resize', measureLineBreaks);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener('loading', measureLineBreaks);
      fonts?.removeEventListener('loadingdone', measureLineBreaks);
      fonts?.removeEventListener('loadingerror', measureLineBreaks);
      window.removeEventListener('resize', measureLineBreaks);
    };
  }, [measureLineBreaks]);

  useEffect(() => {
    if (!reducedMotion || (phase !== 'scrambling' && phase !== 'handoff')) return;
    clearTimer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- finish an active reveal when the user enables reduced motion.
    setPhase('complete');
  }, [clearTimer, phase, reducedMotion]);

  useEffect(() => clearTimer, [clearTimer]);

  const finishForInteraction = useCallback(() => {
    if (phase === 'scrambling' || phase === 'handoff') {
      clearTimer();
      setPhase('complete');
    }
  }, [clearTimer, phase]);

  const RichContent = as === 'li' ? 'div' : 'span';
  const ScrambleOverlay = as === 'li' ? 'div' : 'span';
  const active = phase === 'scrambling' || phase === 'handoff';
  const richHidden = phase === 'waiting' || phase === 'scrambling';
  const richClassName = [styles.scrambleRichContent, richHidden ? styles.scrambleRichHidden : '']
    .filter(Boolean)
    .join(' ');
  const overlayClassName = [
    styles.scrambleOverlay,
    phase === 'handoff' ? styles.scrambleOverlayFading : '',
  ]
    .filter(Boolean)
    .join(' ');

  const richContent = (
    <RichContent ref={setRichContentRef} className={richClassName}>
      <ScrambleBlockNestingContext.Provider value>{children}</ScrambleBlockNestingContext.Provider>
    </RichContent>
  );
  const scrambleOverlay = active ? (
    <ScrambleOverlay className={overlayClassName} aria-hidden="true">
      <TypewriterFrame parts={frameParts} lineBreaks={lineBreaks} />
    </ScrambleOverlay>
  ) : null;

  const blockProps = {
    className: [className, styles.scrambleBlock].filter(Boolean).join(' '),
    onFocusCapture: finishForInteraction,
    onClickCapture: finishForInteraction,
  };

  switch (as) {
    case 'h1':
      return (
        <h1 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h1>
      );
    case 'h2':
      return (
        <h2 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h2>
      );
    case 'h3':
      return (
        <h3 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h3>
      );
    case 'h4':
      return (
        <h4 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h4>
      );
    case 'h5':
      return (
        <h5 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h5>
      );
    case 'h6':
      return (
        <h6 {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </h6>
      );
    case 'li':
      return (
        <li {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </li>
      );
    case 'p':
      return (
        <p {...blockProps} ref={setBlockRef}>
          {richContent}
          {scrambleOverlay}
        </p>
      );
  }
}
