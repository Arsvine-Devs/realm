import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnimationRunController } from '@/features/navigation/model/animationRunController';

describe('AnimationRunController', () => {
  afterEach(() => vi.useRealTimers());
  it('keeps only the latest queued navigation', () => {
    const controller = new AnimationRunController();
    expect(controller.startOrQueue({ url: '/en/content' })).toBe(true);
    expect(controller.startOrQueue({ url: '/en/blog/first' })).toBe(false);
    expect(controller.startOrQueue({ url: '/en/blog/latest' })).toBe(false);

    expect(controller.complete()).toEqual({ url: '/en/blog/latest' });
    expect(controller.isRunning()).toBe(false);
  });

  it('cancels the active animation and registered cleanup exactly once', () => {
    const controller = new AnimationRunController();
    const cancelAnimation = vi.fn();
    const cleanup = vi.fn();
    controller.startOrQueue({ url: '/en/content' });
    controller.setAnimation({ cancel: cancelAnimation } as unknown as Animation);
    controller.addCleanup(cleanup);

    controller.cancel();
    controller.cancel();

    expect(cancelAnimation).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(controller.complete()).toBeNull();
  });

  it('settles transitionend and fallback through one latest run callback', () => {
    vi.useFakeTimers();
    const controller = new AnimationRunController();
    const completed = vi.fn();
    const element = document.createElement('div');
    controller.startOrQueue({ url: '/en/blog/init' });
    controller.waitForTransition(element, 500, completed);

    element.dispatchEvent(new Event('transitionend'));
    vi.advanceTimersByTime(500);
    expect(completed).toHaveBeenCalledOnce();

    const cancelled = vi.fn();
    controller.waitForTransition(element, 500, cancelled);
    controller.cancel();
    vi.advanceTimersByTime(500);
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('ignores normal WAAPI cancellation but surfaces unexpected animation failures', async () => {
    const controller = new AnimationRunController();
    const finished = vi.fn();
    const failed = vi.fn();
    let rejectAnimation: ((reason?: unknown) => void) | undefined;
    const animation = {
      cancel: vi.fn(),
      finished: new Promise<void>((_resolve, reject) => {
        rejectAnimation = reject;
      }),
    } as unknown as Animation;

    controller.runAnimation(animation, finished, failed);
    rejectAnimation?.(new DOMException('cancelled', 'AbortError'));
    await Promise.resolve();
    expect(failed).not.toHaveBeenCalled();

    const brokenAnimation = {
      cancel: vi.fn(),
      finished: Promise.reject(new Error('animation engine failed')),
    } as unknown as Animation;
    controller.runAnimation(brokenAnimation, finished, failed);
    await vi.waitFor(() => expect(failed).toHaveBeenCalledWith(expect.any(Error)));
  });
});
