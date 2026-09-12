import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const align = vi.fn();
const cancel = vi.fn();
const isPending = vi.fn(() => false);

vi.mock('@/features/navigation/model/LayoutAnchorsContext', () => ({
  useLayoutAnchors: () => ({ align, cancel, isPending }),
}));

import { useContentHashAlignment } from '@/app/shell/useMainLayoutEffects';

afterEach(() => {
  align.mockReset();
  cancel.mockReset();
  isPending.mockReset();
  isPending.mockReturnValue(false);
  window.history.replaceState({}, '', '/zh-CN');
});

describe('useContentHashAlignment', () => {
  it('aligns an App Router content route from the current browser fragment', () => {
    window.history.replaceState({}, '', '/zh-TW/content#life');

    renderHook(() => useContentHashAlignment('/zh-TW/content', '/zh-TW/content'));

    expect(align).toHaveBeenCalledWith({
      hash: 'life',
      requestId: expect.stringMatching(/^content-hash-\d+$/),
    });
  });

  it('retains the Pages Router asPath fallback', () => {
    renderHook(() => useContentHashAlignment('/[locale]/content', '/en/content#blog'));

    expect(align).toHaveBeenCalledWith({
      hash: 'blog',
      requestId: expect.stringMatching(/^content-hash-\d+$/),
    });
  });

  it('scopes cleanup to its own request when the route query changes', () => {
    window.history.replaceState({}, '', '/zh-CN/content#blog');
    const { rerender } = renderHook(
      ({ asPath }) => useContentHashAlignment('/zh-CN/content', asPath),
      { initialProps: { asPath: '/zh-CN/content?lang=zh-CN' } },
    );

    const request = align.mock.calls[0]?.[0] as { requestId: string };
    rerender({ asPath: '/zh-CN/content' });

    expect(cancel).toHaveBeenCalledWith(request.requestId);
  });
});
