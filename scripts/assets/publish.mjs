import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const [mediaDirectory, buildDirectory = 'dist'] = process.argv.slice(2);
if (!mediaDirectory) throw Error('Usage: pnpm assets:publish <media-directory> [build-directory]');

const publicRoot = resolve(mediaDirectory, 'public');
const privateRoot = resolve(mediaDirectory, 'private');
const buildRoot = resolve(buildDirectory, 'media');
const { version } = JSON.parse(
  await readFile(join(buildDirectory, 'local-manifest', 'manifest.generated.json'), 'utf8'),
);
if (typeof version !== 'string' || !/^\d{8}T\d{6}Z$/.test(version))
  throw Error('Invalid asset build version');

const publicSource = join(buildRoot, 'public-root');
const privateSource = join(buildRoot, 'private-root');
const catalogRelative = join('realm', 'catalog', 'versions', version);

function collectMediaKeys(record, keys) {
  if (!record || typeof record !== 'object') return;
  if (typeof record.objectKey === 'string') keys.add(record.objectKey);
  for (const value of Object.values(record)) collectMediaKeys(value, keys);
}

const keys = new Set();
for (const section of ['home', 'works', 'collections', 'links', 'audio', 'static-assets']) {
  const catalog = JSON.parse(
    await readFile(join(privateSource, catalogRelative, `${section}.json`), 'utf8'),
  );
  collectMediaKeys(catalog, keys);
}
for (const key of keys) {
  const segments = key.split('/');
  const prefix = segments.slice(0, 2).join('/');
  if (
    !['realm/images', 'realm/audio', 'shared/fonts'].includes(prefix) ||
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'),
    )
  ) {
    throw Error(`Invalid catalog media key: ${key}`);
  }
  const object = await lstat(join(publicSource, ...segments));
  if (!object.isFile() || !object.size) throw Error(`Missing or empty catalog media: ${key}`);
}

async function atomicWrite(file, bytes) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx', flush: true });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function publishImmutable(destination, bytes) {
  const previous = await readFile(destination).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous && !previous.equals(bytes)) {
    throw Error(`Existing release object differs: ${destination}`);
  }
  if (!previous) await atomicWrite(destination, bytes);
}

async function copyRelease(source, target) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const origin = join(source, entry.name);
    const destination = join(target, entry.name);
    if (entry.isDirectory()) {
      await copyRelease(origin, destination);
    } else if (entry.isFile()) {
      await publishImmutable(destination, await readFile(origin));
    } else {
      throw Error(`Release candidate includes a non-regular file: ${entry.name}`);
    }
  }
}

await copyRelease(join(publicSource, 'realm', 'images'), join(publicRoot, 'realm', 'images'));
await copyRelease(join(publicSource, 'realm', 'audio'), join(publicRoot, 'realm', 'audio'));
await copyRelease(join(privateSource, catalogRelative), join(privateRoot, catalogRelative));

const fonts = join('shared', 'fonts');
const sourceFonts = join(publicSource, fonts);
const targetFonts = join(publicRoot, fonts);
const fontEntries = await readdir(sourceFonts, { withFileTypes: true });
const stylesheets = new Map();
for (const entry of fontEntries) {
  if (entry.isDirectory()) continue;
  const name = /^realm-fonts-(critical|extended)\.([a-f0-9]{12})\.css$/.exec(entry.name);
  if (!entry.isFile() || !name || stylesheets.has(name[1])) {
    throw Error(`Unexpected font entry: ${entry.name}`);
  }
  const bytes = await readFile(join(sourceFonts, entry.name));
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (digest !== name[2]) throw Error(`Font stylesheet digest mismatch: ${entry.name}`);
  stylesheets.set(name[1], { filename: entry.name, bytes });
}
if (stylesheets.size !== 2) throw Error('The critical and extended font stylesheets are required');
for (const entry of fontEntries) {
  if (entry.isDirectory()) {
    await copyRelease(join(sourceFonts, entry.name), join(targetFonts, entry.name));
  }
}
for (const { filename, bytes } of stylesheets.values()) {
  await publishImmutable(join(targetFonts, filename), bytes);
}

await atomicWrite(
  join(privateRoot, 'realm', 'catalog', 'current.json'),
  `${JSON.stringify({ version })}\n`,
);

console.log(`Published Realm media ${version}`);
