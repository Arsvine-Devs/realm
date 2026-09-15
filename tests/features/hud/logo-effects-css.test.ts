import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('logo effects CSS contract', () => {
  it('limits animated work to a square visual layer without runtime filters', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/app/styles/layout/_left-panel-core.scss'),
      'utf8',
    );
    const logoSection = source.slice(
      source.indexOf('// LOGO容器'),
      source.indexOf('// --- 新增: Power'),
    );

    expect(logoSection).toMatch(/\.logoReveal\s*{[\s\S]*?width:\s*57%;[\s\S]*?aspect-ratio:\s*1;/);
    expect(logoSection).toContain(
      "mask: url('/avatar_transparent.webp') center / contain no-repeat",
    );
    expect(logoSection).toContain('will-change: transform, opacity');
    expect(logoSection).not.toContain('filter:');
    expect(logoSection).not.toContain('drop-shadow');
  });
});
