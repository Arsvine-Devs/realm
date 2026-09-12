import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { resetTransitionSurface } from '@/features/navigation/model/transitionSurface';

describe('TransitionProvider recovery contracts', () => {
  it('resets every transition surface style', () => {
    const wrapper = {
      style: {
        opacity: '0',
        transform: 'translateX(10px)',
        clipPath: 'inset(20%)',
        transition: 'opacity 1s',
      },
    } as unknown as HTMLElement;

    resetTransitionSurface(wrapper);

    expect(wrapper.style.opacity).toBe('');
    expect(wrapper.style.transform).toBe('');
    expect(wrapper.style.clipPath).toBe('');
    expect(wrapper.style.transition).toBe('');
  });

  it('keeps reduced-motion navigation on the direct push path', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/features/navigation/model/TransitionProvider.tsx'),
      'utf8',
    );
    expect(source).toContain('if (reducedMotion) {');
    expect(source).toContain("'[navigation] reduced-motion navigation failed:'");
  });
});
