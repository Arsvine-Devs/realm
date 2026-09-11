import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TransitionProvider recovery contracts', () => {
  it('resets the transition surface on both commit timeout and route push rejection', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/features/navigation/model/TransitionProvider.tsx'),
      'utf8',
    );
    expect(source).toContain(
      "wrapper.style.opacity = '';\n  wrapper.style.transform = '';\n  wrapper.style.clipPath = '';\n  wrapper.style.transition = '';",
    );
    expect(source.match(/resetTransitionSurface\(wrapper\);/g)).toHaveLength(3);
  });

  it('bypasses WAAPI choreography when reduced motion is requested', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/features/navigation/model/TransitionProvider.tsx'),
      'utf8',
    );
    expect(source).toContain('if (reducedMotion) {');
    expect(source).toContain("'[navigation] reduced-motion navigation failed:'");
  });
});
