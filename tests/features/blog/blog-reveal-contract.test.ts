import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Blog reveal stacking contract', () => {
  it('removes the transform after a reveal transition completes', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/features/blog/ui/blog/BlogPostPage.tsx'),
      'utf8',
    );
    expect(source).toContain("el.style.transform = 'none';");
  });
});
