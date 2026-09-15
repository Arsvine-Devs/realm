import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadProjectEnv, readEnv, readEnvList } from '@/../scripts/lib/env-provider.mjs';

const temporaryDirectories: string[] = [];
const testKey = 'ARSVINE_ENV_PROVIDER_TEST';

afterEach(async () => {
  delete process.env[testKey];
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('Realm environment provider', () => {
  it('keeps inherited values and applies dotenv files from high to low priority', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'arsvine-env-provider-'));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, '.env'), `${testKey}=base\n`);
    await writeFile(path.join(directory, '.env.production'), `${testKey}=mode\n`);
    await writeFile(path.join(directory, '.env.local'), `${testKey}=local\n`);
    await writeFile(path.join(directory, '.env.production.local'), `${testKey}=mode-local\n`);

    loadProjectEnv({ cwd: directory, mode: 'production' });
    expect(readEnv(testKey)).toBe('mode-local');
    expect(readEnvList(testKey)).toEqual(['mode-local']);

    process.env[testKey] = 'inherited';
    loadProjectEnv({ cwd: directory, mode: 'production' });
    expect(readEnv(testKey)).toBe('inherited');
  });
});
