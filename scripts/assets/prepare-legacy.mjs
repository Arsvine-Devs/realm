import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSourceManifests } from './lib/source-manifests.mjs';
import { ensureEmptyDir, toPosix } from './lib/filesystem.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs(args) {
  const options = { workspace: path.join(REPO_ROOT, 'cos-workspace'), date: '' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split('=', 2);
    if (name !== '--workspace' && name !== '--date') throw new Error(`Unknown argument: ${arg}`);
    const value = inlineValue || args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
    if (name === '--workspace') options.workspace = path.resolve(process.cwd(), value);
    if (name === '--date') options.date = value;
  }
  if (!options.date) throw new Error('Missing required argument: --date YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error(`Invalid --date: ${options.date}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const WORKSPACE_ROOT = options.workspace;
const LEGACY_ROOT = path.join(WORKSPACE_ROOT, 'public-root-legacy');
const PUBLIC_ROOT = path.join(WORKSPACE_ROOT, 'public-root');
const META_ROOT = path.join(WORKSPACE_ROOT, '_meta', 'realm');
const CANONICAL_DATE = options.date.split('-');
const CATALOG_DATE = options.date;
const {
  projectItems: PROJECT_ITEMS,
  lifeItems: LIFE_ITEMS,
  experienceItems: EXPERIENCE_ITEMS,
  localLinkItems: LOCAL_LINK_ITEMS,
  audioItems: AUDIO_ITEMS,
} = loadSourceManifests();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeTags(values) {
  return values
    .map((value) => {
      const slug = slugify(value);
      return slug || String(value).trim();
    })
    .filter(Boolean);
}

function makeSource(relativePath) {
  return `public-root/${relativePath}`;
}

function prefixRecordId(record, prefix) {
  return {
    ...record,
    id: `${prefix}-${record.id}`,
  };
}

async function copyFileStrict(sourcePath, destinationPath) {
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { force: true });
}

async function copyDirectoryContents(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    await cp(path.join(sourceDir, entry.name), path.join(destinationDir, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function buildLegacyIndex(root) {
  const files = new Map();
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      files.set(toPosix(path.relative(root, fullPath)), fullPath);
    }
  }
  await walk(root);
  return files;
}

function buildImageDestination(section, slug, variant, ext) {
  return toPosix(
    path.join('realm', 'images', section, ...CANONICAL_DATE, `${slug}-${variant}${ext}`),
  );
}

async function stageStructuredAssets(legacyFiles) {
  const sourceMap = new Map();

  const stageLegacyAsset = async (legacyRelative, outputRelative) => {
    const sourcePath = legacyFiles.get(legacyRelative);
    if (!sourcePath) {
      throw new Error(`Missing legacy asset: ${legacyRelative}`);
    }
    const destinationPath = path.join(PUBLIC_ROOT, ...outputRelative.split('/'));
    await copyFileStrict(sourcePath, destinationPath);
    sourceMap.set(legacyRelative, makeSource(outputRelative));
    return makeSource(outputRelative);
  };

  const worksRecords = [];
  for (const [index, item] of PROJECT_ITEMS.entries()) {
    const slug = slugify(item.id);
    const coverSource = await stageLegacyAsset(
      item.cover,
      buildImageDestination('works', slug, 'cover', path.extname(item.cover)),
    );

    for (const [galleryIndex, legacyRelative] of item.gallery.entries()) {
      const variant = legacyRelative.startsWith('posts/')
        ? `shot-${galleryIndex + 1}`
        : `gallery-${galleryIndex + 1}`;
      await stageLegacyAsset(
        legacyRelative,
        buildImageDestination('works', slug, variant, path.extname(legacyRelative)),
      );
    }

    worksRecords.push({
      id: slug,
      status: 'published',
      title: item.title,
      description: item.description,
      alt: `${item.title} cover`,
      source: coverSource,
      tags: normalizeTags(item.tech),
      collection: item.collection,
      order: index + 1,
      date: item.date,
    });
  }

  const lifeCollections = [];
  const lifeGalleryRecords = [];
  for (const [index, item] of LIFE_ITEMS.entries()) {
    const slug = slugify(item.id);
    const coverSource = await stageLegacyAsset(
      item.cover,
      buildImageDestination('life', slug, 'cover', path.extname(item.cover)),
    );

    const coverRecord = {
      id: slug,
      status: 'published',
      title: item.title,
      description: item.description,
      alt: `${item.title} cover`,
      source: coverSource,
      tags: normalizeTags(item.tech),
      collection: item.collection,
      order: index + 1,
      date: item.date || CATALOG_DATE,
    };
    lifeCollections.push({ cover: coverRecord });

    for (const [galleryIndex, legacyRelative] of item.gallery.entries()) {
      const variant = `gallery-${galleryIndex + 1}`;
      const source = await stageLegacyAsset(
        legacyRelative,
        buildImageDestination('life', slug, variant, path.extname(legacyRelative)),
      );
      lifeGalleryRecords.push({
        id: `${slug}-${variant}`,
        status: 'published',
        title: item.title,
        description: item.description,
        alt: `${item.title} gallery ${galleryIndex + 1}`,
        source,
        tags: normalizeTags(item.tech),
        collection: item.collection,
        order: galleryIndex + 1,
        date: item.date || CATALOG_DATE,
      });
    }
  }

  const experienceRecords = [];
  for (const entry of EXPERIENCE_ITEMS) {
    const slug = slugify(entry.id);
    for (const [index, legacyRelative] of entry.gallery.entries()) {
      const source = await stageLegacyAsset(
        legacyRelative,
        buildImageDestination(
          'experience',
          slug,
          `gallery-${index + 1}`,
          path.extname(legacyRelative),
        ),
      );
      experienceRecords.push({
        id: `${slug}-gallery-${index + 1}`,
        status: 'published',
        title: entry.title,
        description: entry.location,
        alt: `${entry.title} gallery ${index + 1}`,
        source,
        tags: [slugify(entry.type), slugify(entry.location)].filter(Boolean),
        collection: 'experience',
        order: index + 1,
        date: CATALOG_DATE,
      });
    }
  }

  const linkRecords = [];
  for (const [index, link] of LOCAL_LINK_ITEMS.entries()) {
    const slug = slugify(link.id);
    const source = await stageLegacyAsset(
      link.avatar,
      buildImageDestination('links', slug, 'avatar', path.extname(link.avatar)),
    );
    linkRecords.push({
      id: slug,
      status: 'published',
      title: link.title,
      description: link.description,
      alt: `${link.title} avatar`,
      source,
      tags: ['friend-link'],
      collection: 'links',
      order: index + 1,
      date: CATALOG_DATE,
    });
  }

  const usedLegacy = new Set(sourceMap.keys());
  for (const [legacyRelative] of legacyFiles) {
    if (usedLegacy.has(legacyRelative)) continue;
    if (
      legacyRelative.startsWith('fonts/') ||
      legacyRelative.startsWith('music/') ||
      legacyRelative === 'test/echo.txt'
    ) {
      continue;
    }
    const parsed = path.posix.parse(legacyRelative);
    await stageLegacyAsset(
      legacyRelative,
      toPosix(
        path.join(
          'realm',
          'images',
          'archive',
          ...CANONICAL_DATE,
          `${slugify(parsed.name)}${parsed.ext}`,
        ),
      ),
    );
  }

  for (const item of AUDIO_ITEMS) {
    const sourcePath = legacyFiles.get(`music/${item.file}`);
    if (!sourcePath) {
      throw new Error(`Missing legacy audio file: music/${item.file}`);
    }
    const destination = toPosix(
      path.join('realm', 'audio', ...CANONICAL_DATE, `${item.id}${path.extname(item.file)}`),
    );
    await copyFileStrict(sourcePath, path.join(PUBLIC_ROOT, ...destination.split('/')));
    sourceMap.set(`music/${item.file}`, makeSource(destination));
  }

  await copyDirectoryContents(
    path.join(LEGACY_ROOT, 'fonts'),
    path.join(PUBLIC_ROOT, 'shared', 'fonts'),
  );
  const cssPath = path.join(PUBLIC_ROOT, 'shared', 'fonts', 'google-fonts.css');
  const css = await readFile(cssPath, 'utf-8');
  await writeFile(
    cssPath,
    css.replaceAll('https://cdn.arsvine.com/fonts/', 'https://cdn.arsvine.com/shared/fonts/'),
  );

  const homeRecords = [
    worksRecords[0],
    worksRecords[1],
    lifeCollections[0]?.cover,
    lifeCollections.find((entry) => entry.cover.id === 'zhenjiang')?.cover,
  ]
    .filter(Boolean)
    .map((entry, index) => ({
      ...prefixRecordId(entry, 'home'),
      collection: 'home-featured',
      order: index + 1,
    }));

  const collectionEntries = [
    {
      slug: 'web-projects',
      title: 'Web Projects',
      description: 'Project covers from the portfolio.',
      items: worksRecords
        .filter((item) => item.collection === 'web-projects')
        .map((item) => prefixRecordId(item, 'collection-web-projects')),
    },
    {
      slug: 'early-projects',
      title: 'Early Projects',
      description: 'Archived learning-era project visuals.',
      items: worksRecords
        .filter((item) => item.collection === 'early-projects')
        .map((item) => prefixRecordId(item, 'collection-early-projects')),
    },
    {
      slug: 'life-games',
      title: 'Life Games',
      description: 'Game-related gallery images.',
      items: lifeGalleryRecords
        .filter((item) => item.collection === 'life-games')
        .map((item) => prefixRecordId(item, 'collection-life-games')),
    },
    {
      slug: 'life-travel',
      title: 'Travel',
      description: 'Travel gallery images.',
      items: lifeGalleryRecords
        .filter((item) => item.collection === 'life-travel')
        .map((item) => prefixRecordId(item, 'collection-life-travel')),
    },
    {
      slug: 'life-other',
      title: 'Other Interests',
      description: 'Other interest gallery images.',
      items: lifeGalleryRecords
        .filter((item) => item.collection === 'life-other')
        .map((item) => prefixRecordId(item, 'collection-life-other')),
    },
    {
      slug: 'experience',
      title: 'Experience',
      description: 'Timeline-related gallery images.',
      items: experienceRecords.map((item) => prefixRecordId(item, 'collection-experience')),
    },
  ];

  const collections = {
    collections: [...collectionEntries],
  };

  const audioRecords = AUDIO_ITEMS.map((item, index) => ({
    id: item.id,
    status: 'published',
    title: item.title,
    artist: item.artist,
    source: makeSource(
      toPosix(
        path.join('realm', 'audio', ...CANONICAL_DATE, `${item.id}${path.extname(item.file)}`),
      ),
    ),
    order: index + 1,
    date: CATALOG_DATE,
  }));

  return {
    homeRecords,
    worksRecords,
    collections,
    linkRecords,
    audioRecords,
    legacyAssetSources: Object.fromEntries(sourceMap),
  };
}

async function verifyWorkspace(root) {
  const requiredDirs = ['fonts', 'music', 'covers', 'gallery', 'posts', 'avatar'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(root, dir);
    const info = await stat(dirPath).catch(() => null);
    if (!info?.isDirectory()) {
      throw new Error(`Missing required legacy directory: ${dirPath}`);
    }
  }
}

async function main() {
  await verifyWorkspace(LEGACY_ROOT);
  await ensureEmptyDir(PUBLIC_ROOT);
  await mkdir(META_ROOT, { recursive: true });

  const legacyFiles = await buildLegacyIndex(LEGACY_ROOT);
  const generated = await stageStructuredAssets(legacyFiles);

  await writeFile(
    path.join(META_ROOT, 'home.json'),
    `${JSON.stringify(generated.homeRecords, null, 2)}\n`,
  );
  await writeFile(
    path.join(META_ROOT, 'works.json'),
    `${JSON.stringify(generated.worksRecords, null, 2)}\n`,
  );
  await writeFile(
    path.join(META_ROOT, 'collections.json'),
    `${JSON.stringify(generated.collections, null, 2)}\n`,
  );
  await writeFile(
    path.join(META_ROOT, 'links.json'),
    `${JSON.stringify(generated.linkRecords, null, 2)}\n`,
  );
  await writeFile(
    path.join(META_ROOT, 'audio.json'),
    `${JSON.stringify(generated.audioRecords, null, 2)}\n`,
  );
  await writeFile(
    path.join(META_ROOT, 'legacy-asset-sources.json'),
    `${JSON.stringify(generated.legacyAssetSources, null, 2)}\n`,
  );

  console.log('[assets:prepare-legacy] prepared public-root and catalog metadata');
}

main().catch((error) => {
  console.error('[assets:prepare-legacy] FAILED:', error.message);
  process.exit(1);
});
