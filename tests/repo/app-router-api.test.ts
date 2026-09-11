import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectSourceFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat().filter((file) => /\.(?:ts|tsx)$/.test(file));
}

describe('App Router API migration', () => {
  it('contains no legacy Next API request/response adapter usage', async () => {
    const files = await collectSourceFiles(path.join(process.cwd(), 'src'));
    const contents = await Promise.all(
      files.map(async (file) => ({
        file,
        source: await readFile(file, 'utf8'),
      })),
    );
    const offenders = contents
      .filter(({ source }) =>
        /\bNextApi(?:Request|Response|Handler)\b|runLegacyApiHandler/.test(source),
      )
      .map(({ file }) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

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

  it('does not expose migration-only canary routes', async () => {
    await expect(
      readFile(path.join(process.cwd(), 'src/app/[locale]/app-router-canary/page.tsx'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
