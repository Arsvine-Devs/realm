import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TypewriterFrame from '@/shared/ui/TypewriterFrame';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TypewriterFrame', () => {
  it('keeps word boxes anchored to the original word widths across frames', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const textLength = this.textContent?.length ?? 0;
      return new DOMRect(0, 0, textLength * 10, 20);
    });

    const { container, rerender } = render(
      <TypewriterFrame
        parts={[
          { kind: 'word', text: 'ZZZZZ', anchor: 'Hello' },
          { kind: 'literal', text: ' ' },
          { kind: 'word', text: 'WW', anchor: 'world' },
        ]}
      />,
    );

    const boxes = () => [...container.querySelectorAll<HTMLElement>('[class*="wordBox"]')];
    expect(boxes().map((box) => box.style.width)).toEqual(['50px', '50px']);

    rerender(
      <TypewriterFrame
        parts={[
          { kind: 'word', text: 'x', anchor: 'Hello' },
          { kind: 'literal', text: ' ' },
          { kind: 'word', text: 'YYYYYYYY', anchor: 'world' },
        ]}
      />,
    );

    expect(boxes().map((box) => box.style.width)).toEqual(['50px', '50px']);
  });

  it('can render measured line breaks without changing the frame parts', () => {
    const { container } = render(
      <TypewriterFrame
        lineBreaks={[2]}
        parts={[
          { kind: 'word', text: 'Hello', anchor: 'Hello' },
          { kind: 'literal', text: ' ' },
          { kind: 'word', text: 'world', anchor: 'world' },
        ]}
      />,
    );

    expect(container.querySelectorAll('[class*="line"]').length).toBe(2);
    expect(container.querySelectorAll('[class*="lineFixed"]').length).toBe(2);
    expect(
      [...container.querySelectorAll('[class*="wordVisual"]')]
        .map((element) => element.textContent)
        .join(' '),
    ).toBe('Hello world');
  });

  it('keeps grapheme frames wrappable when no part-level break is available', () => {
    const { container } = render(
      <TypewriterFrame
        lineBreaks={[]}
        parts={[{ kind: 'literal', text: '這是一段需要換行的中文正文' }]}
      />,
    );

    expect(container.querySelector('[class*="lineFixed"]')).toBeNull();
  });
});
