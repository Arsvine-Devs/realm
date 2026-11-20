import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('assets build script', () => {
  it('builds and publishes immutable assets and both font layers', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'arsvine-assets-'));
    const workspaceRoot = path.join(tempRoot, 'cos-workspace');
    const distRoot = path.join(tempRoot, 'dist');
    const publishedRoot = path.join(tempRoot, 'published');
    const fontWorkspace = path.join(workspaceRoot, 'public-root', 'shared', 'fonts');

    await mkdir(
      path.join(workspaceRoot, 'public-root', 'realm', 'images', 'post', '2026', '07', '08'),
      { recursive: true },
    );
    await mkdir(path.join(workspaceRoot, 'public-root', 'realm', 'audio', '2026', '07', '08'), {
      recursive: true,
    });
    await mkdir(path.join(workspaceRoot, '_meta', 'realm'), { recursive: true });
    await mkdir(fontWorkspace, { recursive: true });
    await writeFile(
      path.join(fontWorkspace, 'google-fonts.css'),
      [
        "@font-face { font-family: 'Dosis'; src: url(./dosis.woff2); }",
        "@font-face { font-family: 'Noto Sans SC'; src: url(./noto-sans.woff2); }",
      ].join('\n'),
    );

    const imagePath = path.join(
      workspaceRoot,
      'public-root',
      'realm',
      'images',
      'post',
      '2026',
      '07',
      '08',
      'demo.png',
    );
    const audioPath = path.join(
      workspaceRoot,
      'public-root',
      'realm',
      'audio',
      '2026',
      '07',
      '08',
      'demo-track.m4a',
    );

    await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(imagePath);
    await writeFile(audioPath, Buffer.from('demo-audio'));

    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'home.json'),
      JSON.stringify([], null, 2),
    );
    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'works.json'),
      JSON.stringify(
        [
          {
            id: 'demo-work',
            status: 'published',
            title: 'Demo Work',
            description: 'Demo Description',
            alt: 'Demo Alt',
            source: 'public-root/realm/images/post/2026/07/08/demo.png',
            tags: ['demo'],
            collection: 'alpha',
            order: 1,
            date: '2026-07-08',
          },
        ],
        null,
        2,
      ),
    );
    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'collections.json'),
      JSON.stringify({ collections: [] }, null, 2),
    );
    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'links.json'),
      JSON.stringify([], null, 2),
    );
    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'audio.json'),
      JSON.stringify(
        [
          {
            id: 'demo-track',
            status: 'published',
            title: 'Demo Track',
            artist: 'Demo Artist',
            source: 'public-root/realm/audio/2026/07/08/demo-track.m4a',
            order: 1,
            date: '2026-07-08',
          },
        ],
        null,
        2,
      ),
    );
    await writeFile(
      path.join(workspaceRoot, '_meta', 'realm', 'legacy-asset-sources.json'),
      JSON.stringify(
        {
          'posts/arsvine-realm-screenshot-1.png':
            'public-root/realm/images/post/2026/07/08/demo.png',
          'posts/arsvine-realm-screenshot-2.png':
            'public-root/realm/images/post/2026/07/08/demo.png',
        },
        null,
        2,
      ),
    );

    await execFileAsync(
      process.execPath,
      ['scripts/assets/build.mjs', '--workspace', workspaceRoot, '--dist', distRoot],
      {
        cwd: process.cwd(),
      },
    );

    const manifestRaw = await readFile(
      path.join(distRoot, 'local-manifest', 'manifest.generated.json'),
      'utf-8',
    );
    const manifest = JSON.parse(manifestRaw) as {
      assets: Array<{ objectKey: string; type: string }>;
      fontStylesheets: Array<{ layer: string; filename: string }>;
    };
    expect(manifest.fontStylesheets.map(({ layer }) => layer)).toEqual(['critical', 'extended']);
    await execFileAsync(process.execPath, ['scripts/assets/publish.mjs', publishedRoot, distRoot], {
      cwd: process.cwd(),
    });
    const deployedFonts = path.join(publishedRoot, 'public', 'shared', 'fonts');
    const [critical, extended] = manifest.fontStylesheets;
    expect(critical.filename).toMatch(/^realm-fonts-critical\.[a-f0-9]{12}\.css$/);
    expect(extended.filename).toMatch(/^realm-fonts-extended\.[a-f0-9]{12}\.css$/);
    expect(await readFile(path.join(deployedFonts, critical.filename), 'utf8')).toContain('Dosis');
    expect(await readFile(path.join(deployedFonts, extended.filename), 'utf8')).toContain(
      'Noto Sans SC',
    );
    await expect(readFile(path.join(deployedFonts, 'google-fonts.css'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const imageEntry = manifest.assets.find((entry) => entry.type === 'image');
    const audioEntry = manifest.assets.find((entry) => entry.type === 'audio');

    expect(imageEntry?.objectKey).toMatch(
      /^realm\/images\/post\/2026\/07\/08\/demo\.[a-f0-9]{8}\.png$/,
    );
    expect(audioEntry?.objectKey).toMatch(
      /^realm\/audio\/2026\/07\/08\/demo-track\.[a-f0-9]{8}\.m4a$/,
    );

    const current = { version: (JSON.parse(manifestRaw) as { version: string }).version };
    expect(current.version).toMatch(/^\d{8}T\d{6}Z$/);

    const worksRaw = await readFile(
      path.join(
        distRoot,
        'media',
        'private-root',
        'realm',
        'catalog',
        'versions',
        current.version,
        'works.json',
      ),
      'utf-8',
    );
    const works = JSON.parse(worksRaw) as Array<{ objectKey: string }>;
    expect(works[0].objectKey).toMatch(
      /^realm\/images\/post\/2026\/07\/08\/demo\.[a-f0-9]{8}\.png$/,
    );

    const staticAssetsRaw = await readFile(
      path.join(
        distRoot,
        'media',
        'private-root',
        'realm',
        'catalog',
        'versions',
        current.version,
        'static-assets.json',
      ),
      'utf-8',
    );
    const staticAssets = JSON.parse(staticAssetsRaw) as {
      assets: Record<string, { objectKey: string }>;
    };
    expect(Object.keys(staticAssets.assets)).toEqual([
      'posts/arsvine-realm-screenshot-1.png',
      'posts/arsvine-realm-screenshot-2.png',
    ]);
    expect(staticAssets.assets).not.toHaveProperty('posts/arsvine-realm-sceenshot-1.png');
    expect(staticAssets.assets).not.toHaveProperty('posts/arsvine-realm-sceenshot-2.png');
  });
});
