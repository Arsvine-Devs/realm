import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('app route layout', () => {
  it('removes the retired Pages Router tree', () => {
    const pagesDir = path.join(process.cwd(), 'src', 'pages');
    expect(existsSync(pagesDir), 'src/pages/ must not coexist with App Router routes').toBe(false);
  });

  it('keeps canonical routes and removes retired aliases', () => {
    const appDir = path.join(process.cwd(), 'src', 'app');
    const canonicalRoutes = [
      '[locale]/layout.tsx',
      '[locale]/page.tsx',
      '[locale]/not-found.tsx',
      '[locale]/[...missing]/page.tsx',
      '[locale]/content/page.tsx',
      '[locale]/blog/[slug]/page.tsx',
      '[locale]/life/[slug]/page.tsx',
      '[locale]/web/[id]/page.tsx',
      '[locale]/access/[group]/page.tsx',
    ];
    const retiredAliases = [
      '[locale]/blog/page.tsx',
      '[locale]/license/page.tsx',
      '[locale]/posts/page.tsx',
      '[locale]/posts/[slug]/page.tsx',
      '[locale]/game/page.tsx',
    ];

    for (const route of canonicalRoutes) {
      expect(existsSync(path.join(appDir, route)), `Missing canonical route: ${route}`).toBe(true);
    }

    for (const route of retiredAliases) {
      expect(
        existsSync(path.join(appDir, route)),
        `Retired route must stay deleted: ${route}`,
      ).toBe(false);
    }
  });
});
