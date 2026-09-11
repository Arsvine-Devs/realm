import { useEffect, type RefObject } from 'react';

import useMediaQuery from '@/shared/hooks/useMediaQuery';

const FINE_DESKTOP_POINTER_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const MAX_OFFSET_PX = 8;
const POSITION_LERP = 0.12;

export default function useLogoEffects(
  logoRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): void {
  const hasFineDesktopPointer = useMediaQuery(FINE_DESKTOP_POINTER_QUERY);

  useEffect(() => {
    if (!enabled || !hasFineDesktopPointer) return;
    const element = logoRef.current;
    if (!element) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let split = 0;
    let frameId = 0;
    let running = false;

    const finish = () => {
      split = 0;
      running = false;
      frameId = 0;
      element.style.setProperty('--avatar-split', '0');
      element.removeAttribute('data-logo-motion');
    };

    const tick = () => {
      const previousX = current.x;
      const previousY = current.y;
      current.x += (target.x - current.x) * POSITION_LERP;
      current.y += (target.y - current.y) * POSITION_LERP;

      const speed = Math.hypot(current.x - previousX, current.y - previousY);
      const splitTarget = Math.min(1, speed * 3);
      split += (splitTarget - split) * (splitTarget > split ? 0.5 : 0.12);

      element.style.setProperty(
        'transform',
        `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`,
      );
      element.style.setProperty('--avatar-split', split.toFixed(3));

      const stillMoving =
        Math.abs(target.x - current.x) > 0.05 ||
        Math.abs(target.y - current.y) > 0.05 ||
        split > 0.005;
      if (stillMoving) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }
      finish();
    };

    const onPointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      target.x =
        Math.max(-1, Math.min(1, (event.clientX - width / 2) / (width / 2))) * MAX_OFFSET_PX;
      target.y =
        Math.max(-1, Math.min(1, (event.clientY - height / 2) / (height / 2))) * MAX_OFFSET_PX;
      if (running) return;

      running = true;
      element.setAttribute('data-logo-motion', 'active');
      frameId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frameId) window.cancelAnimationFrame(frameId);
      element.removeAttribute('data-logo-motion');
      element.style.removeProperty('--avatar-split');
      element.style.removeProperty('transform');
    };
  }, [enabled, hasFineDesktopPointer, logoRef]);
}
