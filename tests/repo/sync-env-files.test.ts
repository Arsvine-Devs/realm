import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('sync-env-files script', () => {
  it('preserves registered values, fills missing keys, and prunes static topology overrides', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'arsvine-env-sync-'));
    const localPath = path.join(tempDir, '.env.local');
    const examplePath = path.join(tempDir, '.env.example');

    await writeFile(
      localPath,
      [
        '# legacy local file',
        'PORT=4000',
        'NEXT_PUBLIC_SITE_URL=https://dev.arsvine.com',
        'LEGACY_PUBLIC_ASSET_ORIGIN=https://cdn.arsvine.com',
        'GITHUB_READ_TOKEN=retired-token',
        'REVALIDATE_SECRET=retired-secret',
        'ACCESS_GRANT_SECRET=my-secret',
        'TOTP_GROUPS_JSON=\'{"friends-a":{"current":"abc"}}\'',
      ].join('\n'),
      'utf-8',
    );
    await writeFile(
      examplePath,
      '# old example\nLEGACY_PUBLIC_ASSET_BASE=https://cdn.arsvine.com\n',
      'utf-8',
    );

    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-env-files.mjs');
    await execFileAsync(
      process.execPath,
      [scriptPath, '--local', localPath, '--example', examplePath],
      {
        cwd: process.cwd(),
      },
    );

    const localOutput = await readFile(localPath, 'utf-8');
    const exampleOutput = await readFile(examplePath, 'utf-8');

    expect(localOutput).toContain('PORT=4000');
    expect(localOutput).not.toContain('NEXT_PUBLIC_SITE_URL=https://dev.arsvine.com');
    expect(localOutput).toContain('ACCESS_GRANT_SECRET=my-secret');
    expect(localOutput).toContain('TOTP_GROUPS_JSON=\'{"friends-a":{"current":"abc"}}\'');
    expect(localOutput).not.toContain('NEXT_PUBLIC_CDN_BASE=');
    expect(localOutput).toContain('ANALYZE=');
    expect(localOutput).toContain('NEXT_BUILD_DIR=');
    expect(localOutput).not.toContain('LEGACY_PUBLIC_ASSET_ORIGIN=');
    expect(localOutput).not.toContain('GITHUB_READ_TOKEN=');
    expect(localOutput).not.toContain('REVALIDATE_SECRET=');
    expect(localOutput).not.toContain('UNREGISTERED_KEY=');

    expect(exampleOutput).not.toContain('NEXT_PUBLIC_CDN_BASE=');
    expect(exampleOutput).toContain('# ANALYZE=true');
    expect(exampleOutput).toContain('# NEXT_BUILD_DIR=.next');
    expect(exampleOutput).not.toContain('LEGACY_PUBLIC_ASSET_BASE=');
  });
});
