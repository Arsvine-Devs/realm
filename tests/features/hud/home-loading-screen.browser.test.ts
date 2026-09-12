import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import { collectGsapTargets } from '@/features/hud/ui/loading/HomeLoadingScreen';
import HomeLoadingScreen from '@/features/hud/ui/loading/HomeLoadingScreen';
import { completeInitialBootSequence } from '@/features/hud/model/homeLoadingSession';

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudPerformance: () => ({ allowDecorativeMotion: true }),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useReducedMotion: () => false,
  useResponsive: () => ({ isMobile: false }),
}));

describe('collectGsapTargets', () => {
  it('filters null and undefined targets before passing them to GSAP', () => {
    const nodeA = {} as HTMLDivElement;
    const nodeB = {} as HTMLDivElement;

    expect(collectGsapTargets([nodeA, null, undefined, nodeB])).toEqual([nodeA, nodeB]);
  });
});

describe('HomeLoadingScreen session remount', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-initial-boot-complete');
  });

  it('does not render or re-notify when the document boot sequence is complete', () => {
    completeInitialBootSequence();
    const onComplete = vi.fn();
    const firstMount = render(createElement(HomeLoadingScreen, { onComplete }));

    expect(firstMount.container.childElementCount).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();

    firstMount.unmount();
    const secondMount = render(createElement(HomeLoadingScreen, { onComplete }));

    expect(secondMount.container.childElementCount).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
