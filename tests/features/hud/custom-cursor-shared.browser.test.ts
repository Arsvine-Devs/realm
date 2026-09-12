import { describe, expect, it, vi } from 'vitest';

import {
  findClosestInteractiveElement,
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
    near.remove();
    far.remove();
  });

  it('honors an explicit empty cursor label without falling back to aria-label', () => {
    const target = document.createElement('span');
    target.setAttribute('aria-label', 'Reveal hidden content');
    target.setAttribute('data-cursor-label', '');

    expect(resolveCursorLabel(target)).toBe('');
  });
});
