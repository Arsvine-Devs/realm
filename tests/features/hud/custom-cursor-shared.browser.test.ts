import { describe, expect, it, vi } from 'vitest';

import {
  findClosestInteractiveElement,
  getVisibleCursorRect,
  resolveCursorLabel,
} from '@/features/hud/ui/cursor/customCursorShared';

function mockRect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height } as DOMRect;
}

describe('custom cursor magnetic target lookup', () => {
  it('only checks computed styles for candidates within magnetic distance', () => {
    const near = document.createElement('button');
    const far = document.createElement('button');
    document.body.append(near, far);
    near.getBoundingClientRect = vi.fn(() => mockRect(10, 10, 30, 30));
    far.getBoundingClientRect = vi.fn(() => mockRect(1000, 1000, 30, 30));
    const getComputedStyle = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    } as CSSStyleDeclaration);

    const result = findClosestInteractiveElement([near, far], 20, 20);

    expect(result?.element).toBe(near);
    expect(getComputedStyle.mock.calls.some(([element]) => element === near)).toBe(true);
    expect(getComputedStyle.mock.calls.some(([element]) => element === far)).toBe(false);
    getComputedStyle.mockRestore();
    near.remove();
    far.remove();
  });

  it('ignores playlist items clipped by a scroll container and uses the visible part of a row', () => {
    const scroller = document.createElement('div');
    scroller.style.overflowX = 'hidden';
    scroller.style.overflowY = 'auto';
    const row = document.createElement('button');
    scroller.append(row);
    document.body.append(scroller);
    scroller.getBoundingClientRect = () => mockRect(0, 100, 100, 60);
    row.getBoundingClientRect = () => mockRect(0, 70, 100, 30);

    expect(findClosestInteractiveElement([row], 10, 95)).toBeNull();

    row.getBoundingClientRect = () => mockRect(0, 140, 100, 40);
    expect(getVisibleCursorRect(row)).toMatchObject({ top: 140, bottom: 160, height: 20 });
    expect(findClosestInteractiveElement([row], 10, 150)?.element).toBe(row);

    scroller.remove();
  });

  it('honors an explicit empty cursor label without falling back to aria-label', () => {
    const target = document.createElement('span');
    target.setAttribute('aria-label', 'Reveal hidden content');
    target.setAttribute('data-cursor-label', '');

    expect(resolveCursorLabel(target)).toBe('');
  });
});
