import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import { sourceManifests } from '@/features/assets/contracts/source-manifest';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function writeEmpty(root: string, relativePath: string, content = '') {
  const target = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

describe('prepare-legacy', () => {
  it('builds all manifest groups in an isolated workspace with an explicit date', async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'arsvine-assets-'));
    tempRoots.push(workspace);
    const legacyRoot = path.join(workspace, 'public-root-legacy');
    await Promise.all(
      ['fonts', 'music', 'covers', 'gallery', 'posts', 'avatar', 'test'].map((directory) =>
        mkdir(path.join(legacyRoot, directory), { recursive: true }),
      ),
    );
    await writeEmpty(
      legacyRoot,
      'fonts/google-fonts.css',
      'https://cdn.arsvine.com/fonts/test.woff2',
    );

    const legacySources = [
      ...sourceManifests.portfolio.flatMap((item) => [item.cover, ...item.gallery]),
      ...sourceManifests.life.flatMap((item) => [item.cover, ...item.gallery]),
      ...sourceManifests.experience.flatMap((item) => item.gallery),
      ...sourceManifests.friendLinks.map((item) => item.avatar),
      ...sourceManifests.audio.map((item) => `music/${item.file}`),
    ];
    await Promise.all(legacySources.map((source) => writeEmpty(legacyRoot, source)));

    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), 'scripts/assets/prepare-legacy.mjs'),
        '--workspace',
        workspace,
        '--date',
        '2030-02-03',
      ],
      { encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    const works = JSON.parse(
      await readFile(path.join(workspace, '_meta/realm/works.json'), 'utf8'),
    ) as Array<{ source: string }>;
    const audio = JSON.parse(
      await readFile(path.join(workspace, '_meta/realm/audio.json'), 'utf8'),
    ) as Array<{ date: string }>;
    expect(works).toHaveLength(sourceManifests.portfolio.length);
    expect(works[0].source).toContain('/2030/02/03/');
    expect(audio).toHaveLength(sourceManifests.audio.length);
    expect(audio.every((item) => item.date === '2030-02-03')).toBe(true);
  }, 15_000);
});
