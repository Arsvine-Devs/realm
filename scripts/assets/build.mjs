import { mkdir, stat, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { toPosix, walkFiles } from './lib/filesystem.mjs';
import { copySharedAsset, processAudioFile, processImageFile } from './lib/media-transform.mjs';
import { loadMetaSection, replaceSourceFields } from './lib/catalog-transform.mjs';

const DEFAULT_WORKSPACE = path.join(process.cwd(), 'cos-workspace');
const DEFAULT_DIST = path.join(process.cwd(), 'dist');
const SITE_ASSET_KEYS = new Set([
  'site/about-qr',
  'site/travelling',
  'decor/contour-map',
  'decor/portfolio-title',
  'decor/experience-title',
  'decor/life-title',
  'decor/texture-noise',
]);

function parseArgs(argv) {
  const options = {
    workspace: DEFAULT_WORKSPACE,
    dist: DEFAULT_DIST,
    publishCurrent: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--workspace') {
      options.workspace = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === '--dist') {
      options.dist = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === '--publish-current') {
      options.publishCurrent = true;
    }
  }

  return options;
}

function timestampVersion() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  const options = parseArgs(process.argv);
  const workspaceRoot = options.workspace;
  const publicRoot = path.join(workspaceRoot, 'public-root');
  const metaRoot = path.join(workspaceRoot, '_meta', 'realm');
  const distPublicRoot = path.join(options.dist, 'cos-upload', 'public-root');
  const distPrivateRoot = path.join(options.dist, 'cos-upload', 'private-root');
  const distManifestRoot = path.join(options.dist, 'local-manifest');
  const version = timestampVersion();

  await rm(path.join(options.dist, 'cos-upload'), { recursive: true, force: true });
  await rm(distManifestRoot, { recursive: true, force: true });

  const publicFiles = await walkFiles(publicRoot);
  const assetMap = new Map();
  const manifestEntries = [];

  for (const filePath of publicFiles) {
    const relativePath = toPosix(path.relative(publicRoot, filePath));
    if (relativePath.startsWith('realm/images/')) {
      const imageResult = await processImageFile(
        filePath,
        relativePath,
        distPublicRoot,
        manifestEntries,
      );
      assetMap.set(imageResult.sourceKey, imageResult);
      continue;
    }

    if (relativePath.startsWith('realm/audio/')) {
      const audioResult = await processAudioFile(
        filePath,
        relativePath,
        distPublicRoot,
        manifestEntries,
      );
      assetMap.set(audioResult.sourceKey, audioResult);
      continue;
    }

    await copySharedAsset(filePath, relativePath, distPublicRoot);
  }

  const seenIds = new Set();
  const sections = ['home', 'works', 'collections', 'links', 'audio'];
  const transformedSections = {};

  for (const sectionName of sections) {
    const loadedSection = await loadMetaSection(metaRoot, sectionName);
    transformedSections[sectionName] = replaceSourceFields(loadedSection, assetMap, seenIds);
  }
  const legacyAssetsPath = path.join(metaRoot, 'legacy-asset-sources.json');
  if (
    await stat(legacyAssetsPath)
      .then(() => true)
      .catch(() => false)
  ) {
    const legacySources = await loadMetaSection(metaRoot, 'legacy-asset-sources');
    transformedSections['static-assets'] = replaceSourceFields(
      {
        assets: Object.fromEntries(
          Object.entries(legacySources).map(([key, source]) => [key, { source }]),
        ),
      },
      assetMap,
      seenIds,
    );
  }

  const privateCatalogRoot = path.join(distPrivateRoot, 'realm', 'catalog');
  const versionRoot = path.join(privateCatalogRoot, 'versions', version);
  await mkdir(versionRoot, { recursive: true });

  for (const [sectionName, sectionValue] of Object.entries(transformedSections)) {
    await writeFile(
      path.join(versionRoot, `${sectionName}.json`),
      JSON.stringify(sectionValue, null, 2),
    );
  }

  const currentFileName = options.publishCurrent ? 'current.json' : 'current.next.json';
  await writeFile(
    path.join(privateCatalogRoot, currentFileName),
    JSON.stringify({ version }, null, 2),
  );

  const staticAssets = transformedSections['static-assets']?.assets || {};
  const publicSiteAssets = Object.fromEntries(
    Object.entries(staticAssets)
      .filter(([key]) => SITE_ASSET_KEYS.has(key))
      .map(([key, record]) => [
        key,
        {
          objectKey: record.objectKey,
          ...(record.alt ? { alt: record.alt } : {}),
          ...(record.width ? { width: record.width } : {}),
          ...(record.height ? { height: record.height } : {}),
        },
      ]),
  );
  const publicSiteCatalogRoot = path.join(distPublicRoot, 'realm', 'site-catalog');
  const publicSiteVersionRoot = path.join(publicSiteCatalogRoot, 'versions', version);
  await mkdir(publicSiteVersionRoot, { recursive: true });
  await writeFile(
    path.join(publicSiteVersionRoot, 'assets.json'),
    JSON.stringify({ version, assets: publicSiteAssets }, null, 2),
  );
  await writeFile(
    path.join(publicSiteCatalogRoot, currentFileName),
    JSON.stringify({ version }, null, 2),
  );

  await mkdir(distManifestRoot, { recursive: true });
  await writeFile(
    path.join(distManifestRoot, 'manifest.generated.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        workspaceRoot: toPosix(path.relative(process.cwd(), workspaceRoot)),
        version,
        assets: manifestEntries,
      },
      null,
      2,
    ),
  );

  console.log(`[assets] version=${version}`);
  console.log(`[assets] public files=${publicFiles.length}`);
  console.log(`[assets] output=${toPosix(path.relative(process.cwd(), options.dist))}`);
}

main().catch((error) => {
  console.error('[assets] FAILED:', error.message);
  process.exit(1);
});
