import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('maintenance scripts', () => {
  it('resolves the Google Fonts URL from the current site config', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['scripts/fetch-google-fonts.mjs', '--check-config'],
      { cwd: process.cwd() },
    );

    expect(stdout).toContain('src/shared/config/site.ts');
    expect(stdout).toContain('Config check passed.');
  });

  it('preserves every COS bucket setting required by asset publishing', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'arsvine-env-sync-'));
    temporaryDirectories.push(directory);
    const localPath = path.join(directory, '.env.local');
    const examplePath = path.join(directory, '.env.example');
    await writeFile(
      localPath,
      [
        'COS_PUBLIC_BUCKET=public-bucket',
        'COS_PUBLIC_REGION=ap-hongkong',
        'COS_PRIVATE_BUCKET=private-bucket',
        'COS_PRIVATE_REGION=ap-hongkong',
        'UNREGISTERED_KEY=remove-me',
        '',
      ].join('\n'),
    );

    await execFileAsync(
      process.execPath,
      ['scripts/sync-env-files.mjs', '--local', localPath, '--example', examplePath],
      { cwd: process.cwd() },
    );

    const synchronized = await readFile(localPath, 'utf8');
    expect(synchronized).toContain('COS_PUBLIC_BUCKET=public-bucket');
    expect(synchronized).toContain('COS_PUBLIC_REGION=ap-hongkong');
    expect(synchronized).toContain('COS_PRIVATE_BUCKET=private-bucket');
    expect(synchronized).toContain('COS_PRIVATE_REGION=ap-hongkong');
    expect(synchronized).toContain('UNREGISTERED_KEY=remove-me');
  });
});
