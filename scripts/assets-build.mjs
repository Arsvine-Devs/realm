import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DEFAULT_WORKSPACE = path.join(process.cwd(), 'cos-workspace');
const DEFAULT_DIST = path.join(process.cwd(), 'dist');
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav']);
const ALLOWED_STATUSES = new Set(['published', 'draft', 'hidden']);
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_DIMENSION = 30000;
const MAX_OUTPUT_DIMENSION = 9999;
const MAX_TOTAL_PIXELS = 250_000_000;
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

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function shortHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8);
}

function validateName(name) {
  return /^[a-z0-9-]+$/.test(name);
}

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function ensureFileNameRules(relativePath, warnings) {
  const parsed = path.posix.parse(relativePath);
  if (!validateName(parsed.name)) {
    warnings.push(`Non-canonical file name: ${relativePath}`);
  }
}

function calculateConstrainedSize(width, height) {
  let nextWidth = width;
  let nextHeight = height;

  if (nextWidth > MAX_OUTPUT_DIMENSION || nextHeight > MAX_OUTPUT_DIMENSION) {
    const scale = Math.min(MAX_OUTPUT_DIMENSION / nextWidth, MAX_OUTPUT_DIMENSION / nextHeight);
    nextWidth = Math.max(1, Math.floor(nextWidth * scale));
    nextHeight = Math.max(1, Math.floor(nextHeight * scale));
  }

  const totalPixels = nextWidth * nextHeight;
  if (totalPixels > MAX_TOTAL_PIXELS) {
    const scale = Math.sqrt(MAX_TOTAL_PIXELS / totalPixels);
    nextWidth = Math.max(1, Math.floor(nextWidth * scale));
    nextHeight = Math.max(1, Math.floor(nextHeight * scale));
  }

  return { width: nextWidth, height: nextHeight };
}

async function processImageFile(filePath, relativePath, outRoot, manifestEntries) {
  const warnings = [];
  ensureFileNameRules(relativePath, warnings);

  const inputBuffer = await readFile(filePath);
  const fileStats = await stat(filePath);
  const metadata = await sharp(inputBuffer, { animated: true }).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const totalPixels = width * height;
  const gifFrames = metadata.pages || 1;
  const ext = path.extname(relativePath);
  const parsed = path.posix.parse(relativePath);

  let outputBuffer = inputBuffer;
  let processed = false;

  const exceedsInputBytes = fileStats.size > MAX_IMAGE_BYTES;
  const exceedsDimensions = width > MAX_DIMENSION || height > MAX_DIMENSION;
  const exceedsTotalPixels = totalPixels > MAX_TOTAL_PIXELS;
  const exceedsGifFrames = ext.toLowerCase() === '.gif' && gifFrames > 300;

  if (exceedsInputBytes) warnings.push('Source image exceeds 32MB EdgeOne input limit');
  if (exceedsDimensions) warnings.push('Source image exceeds 30000px EdgeOne input limit');
  if (exceedsTotalPixels) warnings.push('Source image exceeds 250M total pixel limit');
  if (exceedsGifFrames) warnings.push('GIF frame count exceeds 300 frame guideline');

  const needsResize =
    exceedsInputBytes || exceedsDimensions || exceedsTotalPixels || exceedsGifFrames;
  if (needsResize) {
    const constrained = calculateConstrainedSize(width, height);
    outputBuffer = await sharp(inputBuffer, { animated: true })
      .resize({
        width: constrained.width,
        height: constrained.height,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
    processed = true;
  }

  const hash = shortHash(outputBuffer);
  const outFileName = `${parsed.name}.${hash}${ext}`;
  const outRelativePath = path.posix.join(parsed.dir, outFileName);
  const outPath = path.join(outRoot, ...outRelativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, outputBuffer);

  manifestEntries.push({
    originalLocalName: path.basename(filePath),
    sourceLocalPath: toPosix(path.relative(process.cwd(), filePath)),
    hash,
    objectKey: outRelativePath,
    width: metadata.width,
    height: metadata.height,
    size: outputBuffer.length,
    type: 'image',
    date: parsed.dir.split('/').slice(-3).join('-'),
    processed,
    warnings,
  });

  return {
    sourceKey: toPosix(path.join('public-root', relativePath)),
    objectKey: outRelativePath,
    width: metadata.width,
    height: metadata.height,
    size: outputBuffer.length,
    warnings,
    processed,
  };
}

async function processAudioFile(filePath, relativePath, outRoot, manifestEntries) {
  const warnings = [];
  ensureFileNameRules(relativePath, warnings);

  const buffer = await readFile(filePath);
  const parsed = path.posix.parse(relativePath);
  const ext = path.extname(relativePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported audio extension: ${relativePath}`);
  }

  const hash = shortHash(buffer);
  const outRelativePath = path.posix.join(parsed.dir, `${parsed.name}.${hash}${parsed.ext}`);
  const outPath = path.join(outRoot, ...outRelativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);

  manifestEntries.push({
    originalLocalName: path.basename(filePath),
    sourceLocalPath: toPosix(path.relative(process.cwd(), filePath)),
    hash,
    objectKey: outRelativePath,
    size: buffer.length,
    type: 'audio',
    date: parsed.dir.split('/').slice(-3).join('-'),
    warnings,
  });

  return {
    sourceKey: toPosix(path.join('public-root', relativePath)),
    objectKey: outRelativePath,
    size: buffer.length,
    warnings,
  };
}

async function copySharedAsset(filePath, relativePath, outRoot) {
  const outPath = path.join(outRoot, ...relativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await copyFile(filePath, outPath);
}

function replaceSourceFields(value, assetMap, seenIds) {
  if (Array.isArray(value)) {
    return value.map((entry) => replaceSourceFields(entry, assetMap, seenIds));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const next = { ...value };
  if (typeof next.id === 'string') {
    if (seenIds.has(next.id)) {
      throw new Error(`Duplicate asset id detected: ${next.id}`);
    }
    seenIds.add(next.id);
  }

  if (typeof next.status === 'string' && !ALLOWED_STATUSES.has(next.status)) {
    throw new Error(`Unsupported status value: ${next.status}`);
  }

  if (typeof next.source === 'string') {
    const matched = assetMap.get(next.source);
    if (!matched) {
      throw new Error(`Unknown asset source reference: ${next.source}`);
    }
    next.objectKey = matched.objectKey;
    if (matched.width) next.width = matched.width;
    if (matched.height) next.height = matched.height;
    if (matched.size) next.size = matched.size;
    next.sourceLocalPath = next.source;
    delete next.source;
  }

  if (next.status === 'published' && 'objectKey' in next && !next.alt && !next.artist) {
    throw new Error(`Published image record is missing alt text: ${next.id || '<unknown>'}`);
  }

  for (const [key, child] of Object.entries(next)) {
    if (Array.isArray(child) || (child && typeof child === 'object')) {
      next[key] = replaceSourceFields(child, assetMap, seenIds);
    }
  }

  return next;
}

async function loadMetaSection(metaRoot, sectionName) {
  const filePath = path.join(metaRoot, `${sectionName}.json`);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
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
