import { useEffect, useRef, useCallback, useState } from 'react';
import { isAtRest } from '@/features/hud/model/raf-lerp';
import gsap from 'gsap';
import styles from './CustomCursor.module.scss';
import useCursorTargetRegistry from '@/features/hud/model/useCursorTargetRegistry';
import {
  MAGNETIC_DISTANCE,
  MAGNETIC_STRENGTH,
  clamp,
  findClosestInteractiveElement,
  getCursorTargetBounds,
  getInteractiveCursorTarget,
  getVisibleCursorRect,
  lerp,
  resolveCursorLabel,
  type CursorTargetRect,
} from './customCursorShared';

const CustomCursor = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const hLineRef = useRef<HTMLDivElement>(null);
  const vLineRef = useRef<HTMLDivElement>(null);
  const xLineARef = useRef<HTMLDivElement>(null);
  const xLineBRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: -100, y: -100 });
  const rendered = useRef({ x: -100, y: -100 });
  const dotSize = useRef({ w: 24, h: 24 });
  const rafId = useRef<number>(0);
  const runningRef = useRef(false);
  const magneticScanPendingRef = useRef(false);
  const interactiveElsRef = useRef<HTMLElement[]>([]);
  const tickRef = useRef<() => void>(() => {});
  const isHovering = useRef(false);
  const snapTarget = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const hoverEl = useRef<HTMLElement | null>(null);
  const [isTesseractMode, setIsTesseractMode] = useState(false);

  const applyPosition = useCallback((x: number, y: number) => {
    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    const xLineA = xLineARef.current;
    const xLineB = xLineBRef.current;
    const dot = dotRef.current;
    if (!hLine || !vLine || !xLineA || !xLineB || !dot) return;

    hLine.style.transform = `translateY(${y}px)`;
    vLine.style.transform = `translateX(${x}px)`;
    xLineA.style.left = `${x}px`;
    xLineA.style.top = `${y}px`;
    xLineB.style.left = `${x}px`;
    xLineB.style.top = `${y}px`;
    dot.style.transform = `translate(${x - dotSize.current.w / 2}px, ${y - dotSize.current.h / 2}px)`;
  }, []);

  const applyLineMask = useCallback(
    (target: { x: number; y: number; w: number; h: number } | null) => {
      const hLine = hLineRef.current;
      const vLine = vLineRef.current;
      if (!hLine || !vLine) return;

      if (!target) {
        hLine.style.maskImage = '';
        hLine.style.webkitMaskImage = '';
        vLine.style.maskImage = '';
        vLine.style.webkitMaskImage = '';
        return;
      }

      const left = clamp(target.x - target.w / 2, 0, window.innerWidth);
      const right = clamp(target.x + target.w / 2, 0, window.innerWidth);
      const top = clamp(target.y - target.h / 2, 0, window.innerHeight);
      const bottom = clamp(target.y + target.h / 2, 0, window.innerHeight);

      const horizontalMask = `linear-gradient(to right, #000 0, #000 ${left}px, transparent ${left}px, transparent ${right}px, #000 ${right}px, #000 100%)`;
      const verticalMask = `linear-gradient(to bottom, #000 0, #000 ${top}px, transparent ${top}px, transparent ${bottom}px, #000 ${bottom}px, #000 100%)`;

      hLine.style.maskImage = horizontalMask;
      hLine.style.webkitMaskImage = horizontalMask;
      vLine.style.maskImage = verticalMask;
      vLine.style.webkitMaskImage = verticalMask;
    },
    [],
  );

  const syncHoverTarget = useCallback(() => {
    const el = hoverEl.current;
    if (!el) return null;

    const rect = getVisibleCursorRect(el);
    if (!rect) return null;
    const target = getCursorTargetBounds(el, 12, rect);

    snapTarget.current = target;
    dotSize.current = { w: target.w, h: target.h };

    const dot = dotRef.current;
    if (dot) {
      gsap.killTweensOf(dot);
      dot.style.width = `${target.w}px`;
      dot.style.height = `${target.h}px`;
    }

    applyPosition(rendered.current.x, rendered.current.y);
    applyLineMask(target);
    return rect;
  }, [applyLineMask, applyPosition]);

  const resetHoverState = useCallback(() => {
    hoverEl.current = null;
    isHovering.current = false;
    snapTarget.current = null;
    dotSize.current = { w: 24, h: 24 };

    const dot = dotRef.current;
    if (dot) {
      gsap.killTweensOf(dot);
      dot.style.width = '24px';
      dot.style.height = '24px';
      dot.classList.remove(styles.hovering);
    }

    const hLine = hLineRef.current;
    const vLine = vLineRef.current;
    if (hLine) {
      hLine.style.maskImage = '';
      hLine.style.webkitMaskImage = '';
    }
    if (vLine) {
      vLine.style.maskImage = '';
      vLine.style.webkitMaskImage = '';
    }

    const labelEl = labelRef.current;
    if (labelEl) {
      gsap.killTweensOf(labelEl);
      gsap.to(labelEl, { opacity: 0, duration: 0.15 });
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!isHovering.current && magneticScanPendingRef.current) {
        magneticScanPendingRef.current = false;
        const closest = findClosestInteractiveElement(
          interactiveElsRef.current,
          mouse.current.x,
          mouse.current.y,
        );
        if (closest) {
          const cx = closest.rect.left + closest.rect.width / 2;
          const cy = closest.rect.top + closest.rect.height / 2;
          const pull = (1 - closest.distance / MAGNETIC_DISTANCE) * MAGNETIC_STRENGTH;
          mouse.current.x = lerp(mouse.current.x, cx, pull);
          mouse.current.y = lerp(mouse.current.y, cy, pull);
        }
      }

      let hoverRect: CursorTargetRect | null = null;
      if (isHovering.current) {
        hoverRect = syncHoverTarget();
        if (!hoverRect) {
          resetHoverState();
        }
      }

      const target = snapTarget.current;
      let tx = mouse.current.x;
      let ty = mouse.current.y;

      if (target) {
        tx = target.x;
        ty = target.y;
      }

      const speed = isHovering.current ? 0.15 : 0.25;
      rendered.current.x = lerp(rendered.current.x, tx, speed);
      rendered.current.y = lerp(rendered.current.y, ty, speed);

      applyPosition(rendered.current.x, rendered.current.y);

      if (isHovering.current && hoverRect) {
        const mx = mouse.current.x;
        const my = mouse.current.y;
        const margin = 60;

        if (
          mx < hoverRect.left - margin ||
          mx > hoverRect.right + margin ||
          my < hoverRect.top - margin ||
          my > hoverRect.bottom + margin
        ) {
          resetHoverState();
        }
      }

      const atRest = isAtRest(rendered.current.x, tx) && isAtRest(rendered.current.y, ty);
      if (atRest && !isHovering.current) {
        // 光标静止且无 hover 时停帧省 CPU；mousemove / hover-enter 唤醒
        runningRef.current = false;
        return;
      }
      rafId.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;
    runningRef.current = true;
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [applyPosition, interactiveElsRef, resetHoverState, syncHoverTarget]);

  const handleRegisteredEnter = useCallback(
    (el: HTMLElement) => {
      const rect = getVisibleCursorRect(el);
      if (!rect) return;

      hoverEl.current = el;
      isHovering.current = true;
      snapTarget.current = getCursorTargetBounds(el, 0, rect);

      const label = resolveCursorLabel(el);
      syncHoverTarget();

      const labelEl = labelRef.current;
      if (labelEl) {
        labelEl.textContent = label;
        if (label) {
          gsap.to(labelEl, { opacity: 1, duration: 0.2 });
        }
      }

      dotRef.current?.classList.add(styles.hovering);

      if (!runningRef.current) {
        runningRef.current = true;
        rafId.current = requestAnimationFrame(tickRef.current);
      }
    },
    [syncHoverTarget],
  );

  const handleRegisteredLeave = useCallback(
    (event: MouseEvent, currentTarget: HTMLElement) => {
      const nextTarget = getInteractiveCursorTarget(event.relatedTarget);
      if (nextTarget && (nextTarget === hoverEl.current || nextTarget === currentTarget)) {
        return;
      }
      if (nextTarget && nextTarget !== hoverEl.current) return;
      if (hoverEl.current && hoverEl.current !== currentTarget) return;
      resetHoverState();
    },
    [resetHoverState],
  );

  useCursorTargetRegistry({
    interactiveElsRef,
    hoverElRef: hoverEl,
    onEnter: handleRegisteredEnter,
    onLeave: handleRegisteredLeave,
    onHoverTargetRemoved: resetHoverState,
  });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      // 光标移动时若已停帧则重启 rAF
      if (!runningRef.current) {
        runningRef.current = true;
        rafId.current = requestAnimationFrame(tickRef.current);
      }

      if (!isHovering.current) magneticScanPendingRef.current = true;
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [interactiveElsRef]);

  useEffect(() => {
    const handleScroll = () => {
      if (isHovering.current) resetHoverState();
    };
    const handleBlur = () => resetHoverState();
    const handleVisibilityChange = () => {
      if (document.hidden) resetHoverState();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetHoverState]);

  useEffect(() => {
    const handleTesseractCursorHover = (event: Event) => {
      const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
      setIsTesseractMode(active);
    };

    window.addEventListener(
      'arsvine:tesseract-cursor-hover',
      handleTesseractCursorHover as EventListener,
    );
    return () => {
      window.removeEventListener(
        'arsvine:tesseract-cursor-hover',
        handleTesseractCursorHover as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleLeave = () => {
      hLineRef.current?.classList.add(styles.hidden);
      vLineRef.current?.classList.add(styles.hidden);
      xLineARef.current?.classList.add(styles.hidden);
      xLineBRef.current?.classList.add(styles.hidden);
      dotRef.current?.classList.add(styles.hidden);
    };
    const handleEnter = () => {
      hLineRef.current?.classList.remove(styles.hidden);
      vLineRef.current?.classList.remove(styles.hidden);
      xLineARef.current?.classList.remove(styles.hidden);
      xLineBRef.current?.classList.remove(styles.hidden);
      dotRef.current?.classList.remove(styles.hidden);
    };

    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);
    return () => {
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${styles.cursorRoot} ${isTesseractMode ? styles.tesseractMode : ''}`}
    >
      <div ref={hLineRef} className={styles.hLine} />
      <div ref={vLineRef} className={styles.vLine} />
      <div ref={xLineARef} className={styles.xLineA} />
      <div ref={xLineBRef} className={styles.xLineB} />
      <div ref={dotRef} className={styles.dot}>
        <span className={`${styles.corner} ${styles.cornerTl}`} />
        <span className={`${styles.corner} ${styles.cornerTr}`} />
        <span className={`${styles.corner} ${styles.cornerBl}`} />
        <span className={`${styles.corner} ${styles.cornerBr}`} />
        <div ref={labelRef} className={styles.label} />
      </div>
    </div>
  );
};

export default CustomCursor;
