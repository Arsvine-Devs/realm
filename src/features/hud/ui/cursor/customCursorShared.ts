import { lerp, clamp } from '@/features/hud/model/raf-lerp';

export const MAGNETIC_DISTANCE = 120;
export const MAGNETIC_STRENGTH = 0.4;
const GENERIC_CURSOR_INTERACTIVE_SELECTOR = 'a, button, .btn, [role="button"]';
const CURSOR_INTERACTIVE_SELECTOR = `${GENERIC_CURSOR_INTERACTIVE_SELECTOR}, [data-cursor-magnetic]`;

export interface CursorTargetBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export { lerp, clamp };

export function isCursorInteractive(el: HTMLElement | null, rect?: DOMRect) {
  if (!el || !el.isConnected) return false;

  const targetRect = rect ?? el.getBoundingClientRect();
  if (targetRect.width <= 0 || targetRect.height <= 0) return false;

  let current: HTMLElement | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity || '1') === 0
    ) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

export function getInteractiveCursorTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const magneticCandidate = target.closest('[data-cursor-magnetic]');
  if (magneticCandidate instanceof HTMLElement) {
    return isCursorInteractive(magneticCandidate) ? magneticCandidate : null;
  }

  const candidate = target.closest(GENERIC_CURSOR_INTERACTIVE_SELECTOR);
  if (!(candidate instanceof HTMLElement)) return null;
  if (
    candidate.closest('[data-cursor-no-magnetic]') &&
    !candidate.hasAttribute('data-cursor-magnetic')
  ) {
    return null;
  }

  return isCursorInteractive(candidate) ? candidate : null;
}

export function collectInteractiveElements() {
  return Array.from(document.querySelectorAll(CURSOR_INTERACTIVE_SELECTOR)).filter((el) => {
    const htmlEl = el as HTMLElement;
    if (
      htmlEl.closest('[data-cursor-no-magnetic]') &&
      !htmlEl.hasAttribute('data-cursor-magnetic')
    ) {
      return false;
    }
    if (
      !htmlEl.hasAttribute('data-cursor-magnetic') &&
      htmlEl.parentElement?.closest('[data-cursor-magnetic]')
    ) {
      return false;
    }
    return true;
  }) as HTMLElement[];
}

export function getCursorTargetBounds(
  el: HTMLElement,
  padding = 0,
  rect?: DOMRect,
): CursorTargetBounds {
  const targetRect = rect ?? el.getBoundingClientRect();
  const customPadding = Number(el.getAttribute('data-cursor-padding'));
  const resolvedPadding = Number.isFinite(customPadding) ? customPadding : padding;
  return {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
    w: targetRect.width + resolvedPadding,
    h: targetRect.height + resolvedPadding,
  };
}

export function resolveCursorLabel(el: HTMLElement) {
  return el.getAttribute('data-cursor-label') || el.getAttribute('aria-label') || '';
}

export function findClosestInteractiveElement(
  elements: HTMLElement[],
  pointerX: number,
  pointerY: number,
) {
  let closestElement: HTMLElement | null = null;
  let closestRect: DOMRect | null = null;
  let closestDistance = Infinity;

  for (const el of elements) {
    if (!el.isConnected) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const bounds = getCursorTargetBounds(el, 0, rect);
    const dx = Math.max(Math.abs(pointerX - bounds.x) - bounds.w / 2, 0);
    const dy = Math.max(Math.abs(pointerY - bounds.y) - bounds.h / 2, 0);
    const distance = Math.hypot(dx, dy);

    if (
      distance < MAGNETIC_DISTANCE &&
      distance < closestDistance &&
      isCursorInteractive(el, rect)
    ) {
      closestDistance = distance;
      closestElement = el;
      closestRect = rect;
    }
  }

  if (!closestElement || !closestRect) {
    return null;
  }

  const element = closestElement as HTMLElement;
  return {
    element,
    distance: closestDistance,
    rect: closestRect,
  };
}
