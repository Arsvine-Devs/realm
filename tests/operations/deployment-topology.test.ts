import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deployment topology contract', () => {
  it('uses the Next development and standalone production entry points', async () => {
    const root = process.cwd();
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toBe('next dev');
    expect(packageJson.scripts.start).toMatch(/node \.next\/standalone\/server\.js$/);
    expect(packageJson.scripts.build).toBe('next build');
  });
});
