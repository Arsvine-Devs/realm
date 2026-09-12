import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contextMock, revertMock, setMock, timelineMock, toMock } = vi.hoisted(() => {
  const revert = vi.fn();
  const to = vi.fn();
  const timeline = vi.fn(() => ({ to }));
  const context = vi.fn((callback: () => void) => {
    callback();
    return { revert };
  });
  return {
    contextMock: context,
    revertMock: revert,
    setMock: vi.fn(),
    timelineMock: timeline,
    toMock: to,
  };
});

vi.mock('gsap', () => ({
  default: {
    context: contextMock,
    set: setMock,
    timeline: timelineMock,
  },
}));

import { animateTitleCharacters } from '@/shared/lib/title-reveal';

beforeEach(() => {
  vi.useFakeTimers();
  contextMock.mockClear();
  revertMock.mockClear();
  setMock.mockClear();
  timelineMock.mockClear();
  toMock.mockClear();
});

describe('animateTitleCharacters', () => {
  it('cancels a pending reveal before GSAP starts', () => {
    const root = document.createElement('h1');
    root.innerHTML = '<span class="wrapper"><span class="inner">A</span></span>';

    const cleanup = animateTitleCharacters({
      root,
      wrapperSelector: '.wrapper',
      innerSelector: '.inner',
    });
    cleanup();
    vi.runAllTimers();

    expect(contextMock).not.toHaveBeenCalled();
  });

  it('reverts active character tweens during cleanup', () => {
    const root = document.createElement('h1');
    root.innerHTML = '<span class="wrapper"><span class="inner">A</span></span>';

    const cleanup = animateTitleCharacters({
      root,
      wrapperSelector: '.wrapper',
      innerSelector: '.inner',
      startDelayMs: 0,
    });
    vi.runAllTimers();
    cleanup();

    expect(contextMock).toHaveBeenCalledOnce();
    expect(revertMock).toHaveBeenCalledOnce();
  });
});
