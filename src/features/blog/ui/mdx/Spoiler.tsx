'use client';

import { createPortal } from 'react-dom';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import { useSafeTimeouts } from '@/shared/hooks/useSafeTimeouts';

import styles from '../../styles/Spoiler.module.scss';

const SPOILER_PROMPT_THRESHOLD = 3;
const DIALOG_EXIT_MS = 220;

interface SpoilerLineRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SpoilerGeometry {
  lineRects: SpoilerLineRect[];
  pending: boolean;
}

interface SpoilerContextValue {
  isRevealed: (id: string) => boolean;
  register: (id: string) => () => void;
  reveal: (id: string) => void;
}

const fallbackSpoilerContext: SpoilerContextValue = {
  isRevealed: () => false,
  register: () => () => {},
  reveal: () => {},
};

const SpoilerContext = createContext<SpoilerContextValue>(fallbackSpoilerContext);

interface SpoilerConfirmDialogProps {
  onKeepVisible: () => void;
  onRevealAll: () => void;
}

function SpoilerConfirmDialog({ onKeepVisible, onRevealAll }: SpoilerConfirmDialogProps) {
  const t = useTranslations('spoiler');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const reducedMotion = useReducedMotion();
  const timers = useSafeTimeouts();
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const close = (action: () => void) => {
    if (closing) return;
    const finish = () => {
      dialogRef.current?.close();
      action();
    };
    if (reducedMotion) {
      finish();
    } else {
      setClosing(true);
      timers.setTimeout(finish, DIALOG_EXIT_MS);
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`${styles.dialogBackdrop} ${closing ? styles.dialogClosing : ''}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close(onKeepVisible);
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) close(onKeepVisible);
        backdropPress.current = false;
      }}
    >
      <div className={styles.dialogSurface}>
        <span className={styles.dialogMarker} aria-hidden="true">
          {'///'}
        </span>
        <h2 id={titleId} className={styles.dialogTitle}>
          {t('dialogTitle')}
        </h2>
        <p id={descriptionId} className={styles.dialogDescription}>
          {t('dialogDescription')}
        </p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={`${styles.dialogButton} ${styles.keepButton}`}
            onClick={() => close(onKeepVisible)}
          >
            {t('keepVisible')}
          </button>
          <button
            type="button"
            className={`${styles.dialogButton} ${styles.clearButton}`}
            onClick={() => close(onRevealAll)}
          >
            {t('revealAll')}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(() => new Set());
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const promptShownRef = useRef(false);
  const registeredIdsRef = useRef(new Set<string>());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isRevealed = useCallback((id: string) => revealedIds.has(id), [revealedIds]);

  const register = useCallback((id: string) => {
    registeredIdsRef.current.add(id);
    return () => {
      registeredIdsRef.current.delete(id);
    };
  }, []);

  const revealAll = useCallback(() => {
    const allIds = new Set(registeredIdsRef.current);
    revealedIdsRef.current = allIds;
    setRevealedIds(allIds);
    setIsDialogOpen(false);
  }, []);

  const reveal = useCallback((id: string) => {
    const currentIds = revealedIdsRef.current;
    if (currentIds.has(id)) return;

    const nextIds = new Set(currentIds);
    nextIds.add(id);
    revealedIdsRef.current = nextIds;
    setRevealedIds(nextIds);

    if (nextIds.size >= SPOILER_PROMPT_THRESHOLD && !promptShownRef.current) {
      promptShownRef.current = true;
      setIsDialogOpen(true);
    }
  }, []);

  const contextValue = useMemo<SpoilerContextValue>(
    () => ({ isRevealed, register, reveal }),
    [isRevealed, register, reveal],
  );

  return (
    <SpoilerContext.Provider value={contextValue}>
      {children}
      {isDialogOpen && (
        <SpoilerConfirmDialog
          onKeepVisible={() => setIsDialogOpen(false)}
          onRevealAll={revealAll}
        />
      )}
    </SpoilerContext.Provider>
  );
}

interface SpoilerProps {
  children: ReactNode;
}

export default function Spoiler({ children }: SpoilerProps) {
  const t = useTranslations('spoiler');
  const { isRevealed, register, reveal } = useContext(SpoilerContext);
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const contentId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [geometry, setGeometry] = useState<SpoilerGeometry>({ lineRects: [], pending: true });
  const revealed = isRevealed(id);
  const previewVisible = revealed || isHovered || isFocused;

  useEffect(() => register(id), [id, register]);

  const measureLineRects = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content || typeof document === 'undefined') return;

    const wrapperRect = trigger.getBoundingClientRect();
    const range = document.createRange();
    if (typeof range.getClientRects !== 'function') {
      setGeometry((current) => ({ ...current, pending: true }));
      return;
    }

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const rects: DOMRect[] = [];
    let textNode = walker.nextNode();
    while (textNode) {
      range.selectNodeContents(textNode);
      rects.push(
        ...Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0),
      );
      textNode = walker.nextNode();
    }
    const groups: Array<{ left: number; right: number; top: number; bottom: number }> = [];

    rects.forEach((rect) => {
      const existing = groups.find(
        (group) => rect.top < group.bottom + 1.5 && rect.bottom > group.top - 1.5,
      );
      if (existing) {
        existing.left = Math.min(existing.left, rect.left);
        existing.right = Math.max(existing.right, rect.right);
        existing.top = Math.min(existing.top, rect.top);
        existing.bottom = Math.max(existing.bottom, rect.bottom);
        return;
      }
      groups.push({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      });
    });

    const lineRects = groups.map((group) => ({
      left: group.left - wrapperRect.left - 2,
      top: group.top - wrapperRect.top - 1,
      width: group.right - group.left + 4,
      height: group.bottom - group.top + 2,
    }));

    if (lineRects.length === 0 && content.textContent?.trim()) {
      setGeometry((current) => ({ ...current, pending: true }));
      return;
    }

    setGeometry({ lineRects, pending: false });
  }, []);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- geometry is synchronized from the measured DOM range.
    measureLineRects();
    const content = contentRef.current;
    const trigger = triggerRef.current;
    const fonts = document.fonts;
    const handleFontsLoading = () => {
      setGeometry((current) => (current.pending ? current : { ...current, pending: true }));
    };
    const handleFontsSettled = () => measureLineRects();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureLineRects) : null;
    if (observer) {
      if (content) observer.observe(content);
      if (trigger) observer.observe(trigger);
    }
    fonts?.addEventListener('loading', handleFontsLoading);
    fonts?.addEventListener('loadingdone', handleFontsSettled);
    fonts?.addEventListener('loadingerror', handleFontsSettled);
    if (fonts) void fonts.ready.then(handleFontsSettled);
    window.addEventListener('resize', measureLineRects);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener('loading', handleFontsLoading);
      fonts?.removeEventListener('loadingdone', handleFontsSettled);
      fonts?.removeEventListener('loadingerror', handleFontsSettled);
      window.removeEventListener('resize', measureLineRects);
    };
  }, [measureLineRects]);

  const activate = useCallback(() => {
    if (!revealed) reveal(id);
  }, [id, reveal, revealed]);

  const stateClass = revealed
    ? styles.revealed
    : previewVisible
      ? styles.previewVisible
      : styles.concealed;

  return (
    <span
      ref={triggerRef}
      /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a button element would interrupt natural inline line wrapping. */
      role="button"
      tabIndex={0}
      className={`${styles.spoiler} ${stateClass}`}
      aria-pressed={revealed}
      aria-label={revealed ? t('revealedLabel') : t('revealLabel')}
      aria-describedby={revealed ? contentId : undefined}
      data-cursor-label={revealed ? '' : t('clickToReveal')}
      data-cursor-magnetic
      data-spoiler-lines={geometry.pending ? 'pending' : 'ready'}
      data-spoiler-state={revealed ? 'revealed' : previewVisible ? 'preview' : 'concealed'}
      onClick={activate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
    >
      <span
        ref={contentRef}
        id={contentId}
        className={styles.spoilerContent}
        aria-hidden={!revealed}
      >
        {children}
      </span>
      {geometry.lineRects.map((rect, index) => (
        <span
          key={`${id}-line-${index}`}
          className={styles.spoilerCover}
          aria-hidden="true"
          style={rect}
        />
      ))}
    </span>
  );
}
