import { describe, expect, it, vi } from 'vitest';

import {
  getActiveContentSectionHash,
  syncContentHashFromScroll,
} from '@/features/navigation/model/contentHashUrlSync';

function createSection(top: number) {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(0, top, 100, 100);
  return element;
}

describe('content hash URL synchronization', () => {
  it('selects the most recently passed content section', () => {
    const container = document.createElement('div');
    container.getBoundingClientRect = () => new DOMRect(0, 100, 100, 400);
    const sections = new Map([
      ['section-works', createSection(-40)],
      ['section-experience', createSection(60)],
      ['section-blog', createSection(140)],
    ]);

    expect(
      getActiveContentSectionHash(container, {
        getElementById: (id) => sections.get(id) ?? null,
      }),
    ).toBe('experience');
  });

  it('uses replaceState for a changed content hash and does not add history entries', () => {
    const container = document.createElement('div');
    container.getBoundingClientRect = () => new DOMRect(0, 0, 100, 400);
    const replaceState = vi.fn();
    const section = createSection(-10);

    const hash = syncContentHashFromScroll(container, {
      documentRef: { getElementById: (id) => (id === 'section-blog' ? section : null) },
      historyRef: { state: { from: 'test' }, replaceState },
      locationRef: { pathname: '/zh-CN/content', search: '?view=all', hash: '#works' },
    });

    expect(hash).toBe('blog');
    expect(replaceState).toHaveBeenCalledWith({ from: 'test' }, '', '/zh-CN/content?view=all#blog');
  });

  it('does not rewrite an already-current hash or a non-content URL', () => {
    const container = document.createElement('div');
    container.getBoundingClientRect = () => new DOMRect(0, 0, 100, 400);
    const replaceState = vi.fn();
    const section = createSection(-10);
    const documentRef = {
      getElementById: (id: string) => (id === 'section-life' ? section : null),
    };
    const historyRef = { state: null, replaceState };

    syncContentHashFromScroll(container, {
      documentRef,
      historyRef,
      locationRef: { pathname: '/zh-CN/content', search: '', hash: '#life' },
    });
    syncContentHashFromScroll(container, {
      documentRef,
      historyRef,
      locationRef: { pathname: '/zh-CN/blog/init', search: '', hash: '#life' },
    });

    expect(replaceState).not.toHaveBeenCalled();
  });
});
