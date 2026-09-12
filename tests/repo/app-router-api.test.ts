import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('App Router API contracts', () => {
  it('exports only GET for read-only asset and proxy routes', async () => {
    const routeFiles = [
      'src/app/api/assets/audio/route.ts',
      'src/app/api/assets/home/route.ts',
      'src/app/api/assets/links/route.ts',
      'src/app/api/assets/works/route.ts',
      'src/app/api/assets/collections/[slug]/route.ts',
      'src/app/api/hitokoto/route.ts',
    ];
    const unsupportedExport =
      /export\s+(?:const|async function)\s+(?:POST|PUT|PATCH|DELETE|OPTIONS)\b/;

    for (const routeFile of routeFiles) {
      const source = await readFile(path.join(process.cwd(), routeFile), 'utf8');
      expect(source, routeFile).not.toMatch(unsupportedExport);
      expect(source, routeFile).toMatch(/export\s+(?:const|async function)\s+GET\b/);
    }
  });
});
