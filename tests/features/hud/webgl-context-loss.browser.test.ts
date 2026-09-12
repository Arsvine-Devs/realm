import { describe, expect, it, vi } from 'vitest';
import { listenForWebglContextLoss } from '@/features/hud/model/webgl-context-loss';

describe('listenForWebglContextLoss', () => {
  it('prevents default handling and reports a canvas failure once', () => {
    const canvas = document.createElement('canvas');
    const onContextLost = vi.fn();
    const removeListener = listenForWebglContextLoss(canvas, onContextLost);
    const firstEvent = new Event('webglcontextlost', { cancelable: true });
    const secondEvent = new Event('webglcontextlost', { cancelable: true });

    canvas.dispatchEvent(firstEvent);
    canvas.dispatchEvent(secondEvent);

    expect(firstEvent.defaultPrevented).toBe(true);
    expect(secondEvent.defaultPrevented).toBe(true);
    expect(onContextLost).toHaveBeenCalledTimes(1);

    removeListener();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    expect(onContextLost).toHaveBeenCalledTimes(1);
  });
});
