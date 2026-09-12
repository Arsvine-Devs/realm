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

import styles from '../../styles/Spoiler.module.scss';

const SPOILER_PROMPT_THRESHOLD = 3;
const DIALOG_EXIT_MS = 220;

interface SpoilerLineRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SpoilerContextValue {
  isRevealed: (id: string) => boolean;
  register: (id: string) => () => void;
  reveal: (id: string, trigger: HTMLElement | null) => void;
}

const fallbackSpoilerContext: SpoilerContextValue = {
  isRevealed: () => false,
  register: () => () => {},
  reveal: () => {},
};

const SpoilerContext = createContext<SpoilerContextValue>(fallbackSpoilerContext);

interface SpoilerConfirmDialogProps {
  open: boolean;
  closing: boolean;
  onKeepVisible: () => void;
  onRevealAll: () => void;
}

function SpoilerConfirmDialog({
  open,
  closing,
  onKeepVisible,
  onRevealAll,
}: SpoilerConfirmDialogProps) {
  const t = useTranslations('spoiler');
  const keepVisibleRef = useRef<HTMLButtonElement>(null);
  const clearAllRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!open || closing) return;

    const focusInitialAction = () => {
      keepVisibleRef.current?.focus();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const frame = window.requestAnimationFrame(focusInitialAction);
      return () => window.cancelAnimationFrame(frame);
    }

    focusInitialAction();
    return undefined;
  }, [closing, open]);

  useEffect(() => {
    if (!open || closing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onKeepVisible();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = [keepVisibleRef.current, clearAllRef.current].filter(
        (element): element is HTMLButtonElement => element !== null && !element.disabled,
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closing, onKeepVisible, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`${styles.dialogBackdrop} ${closing ? styles.dialogClosing : ''}`}
      role="presentation"
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) onKeepVisible();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onKeepVisible();
      }}
    >
      <dialog
        open
        className={styles.dialogSurface}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
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
            ref={keepVisibleRef}
            type="button"
            className={`${styles.dialogButton} ${styles.keepButton}`}
            onClick={onKeepVisible}
          >
            {t('keepVisible')}
          </button>
          <button
            ref={clearAllRef}
            type="button"
            className={`${styles.dialogButton} ${styles.clearButton}`}
            onClick={onRevealAll}
          >
            {t('revealAll')}
          </button>
        </div>
      </dialog>
    </div>,
    document.body,
  );
}

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(() => new Set());
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const promptShownRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogCloseTimerRef = useRef<number | null>(null);
  const registeredIdsRef = useRef(new Set<string>());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);

  const isRevealed = useCallback((id: string) => revealedIds.has(id), [revealedIds]);

  const restoreTriggerFocus = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (!target?.isConnected) return;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        if (target.isConnected) target.focus();
      });
      return;
    }

    target.focus();
  }, []);

  const finishDialogClose = useCallback(() => {
    dialogCloseTimerRef.current = null;
    setIsDialogOpen(false);
    setIsDialogClosing(false);
  }, []);

  const openDialog = useCallback(() => {
    if (dialogCloseTimerRef.current !== null) {
      window.clearTimeout(dialogCloseTimerRef.current);
      dialogCloseTimerRef.current = null;
    }
    setIsDialogClosing(false);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(
    (shouldRestoreFocus = true) => {
      setIsDialogClosing(true);
      if (shouldRestoreFocus) {
        restoreTriggerFocus();
      } else {
        returnFocusRef.current = null;
      }

      if (typeof window === 'undefined') {
        finishDialogClose();
        return;
      }

      if (dialogCloseTimerRef.current !== null) {
        window.clearTimeout(dialogCloseTimerRef.current);
      }
      dialogCloseTimerRef.current = window.setTimeout(finishDialogClose, DIALOG_EXIT_MS);
    },
    [finishDialogClose, restoreTriggerFocus],
  );

  useEffect(
    () => () => {
      if (dialogCloseTimerRef.current !== null) {
        window.clearTimeout(dialogCloseTimerRef.current);
      }
    },
    [],
  );

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
    closeDialog();
  }, [closeDialog]);

  const reveal = useCallback(
    (id: string, trigger: HTMLElement | null) => {
      const currentIds = revealedIdsRef.current;
      if (currentIds.has(id)) return;

      const nextIds = new Set(currentIds);
      nextIds.add(id);
      revealedIdsRef.current = nextIds;
      setRevealedIds(nextIds);

      if (nextIds.size >= SPOILER_PROMPT_THRESHOLD && !promptShownRef.current) {
        promptShownRef.current = true;
        returnFocusRef.current = trigger;
        openDialog();
      }
    },
    [openDialog],
  );

  const contextValue = useMemo<SpoilerContextValue>(
    () => ({ isRevealed, register, reveal }),
    [isRevealed, register, reveal],
  );

  return (
    <SpoilerContext.Provider value={contextValue}>
      {children}
      <SpoilerConfirmDialog
        open={isDialogOpen}
        closing={isDialogClosing}
        onKeepVisible={closeDialog}
        onRevealAll={revealAll}
      />
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
  const [lineRects, setLineRects] = useState<SpoilerLineRect[]>([]);
  const revealed = isRevealed(id);
  const previewVisible = revealed || isHovered || isFocused;

  useEffect(() => register(id), [id, register]);

  const measureLineRects = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content || typeof document === 'undefined') return;

    const wrapperRect = trigger.getBoundingClientRect();
    const range = document.createRange();
    if (typeof range.getBoundingClientRect !== 'function') {
      setLineRects([]);
      return;
    }

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const rects: DOMRect[] = [];
    let textNode = walker.nextNode();
    while (textNode) {
      const text = textNode.textContent ?? '';
      for (let offset = 0; offset < text.length; offset += 1) {
        if (/\s/.test(text[offset] ?? '')) continue;
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset + 1);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) rects.push(rect);
      }
      textNode = walker.nextNode();
    }
    const groups: Array<{ left: number; right: number; top: number; bottom: number }> = [];

    rects.forEach((rect) => {
      const existing = groups.find((group) => Math.abs(group.top - rect.top) < 1.5);
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

    setLineRects(
      groups.map((group) => ({
        left: group.left - wrapperRect.left - 2,
        top: group.top - wrapperRect.top - 1,
        width: group.right - group.left + 4,
        height: group.bottom - group.top + 2,
      })),
    );
  }, []);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- line geometry is synchronized from the measured DOM range.
    measureLineRects();
    const content = contentRef.current;
    const trigger = triggerRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureLineRects) : null;
    if (observer) {
      if (content) observer.observe(content);
      if (trigger) observer.observe(trigger);
    }
    window.addEventListener('resize', measureLineRects);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureLineRects);
    };
  }, [measureLineRects]);

  const activate = useCallback(() => {
    if (!revealed) reveal(id, triggerRef.current);
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
      data-spoiler-lines={lineRects.length > 0 ? 'ready' : 'pending'}
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
      {lineRects.map((rect, index) => (
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
