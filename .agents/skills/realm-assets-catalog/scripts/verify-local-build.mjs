import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const dist = path.join(root, 'dist');
const manifestPath = path.join(dist, 'local-manifest', 'manifest.generated.json');

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function requireFile(file) {
  await access(file);
  return file;
}

const manifest = await readJson(manifestPath);
if (!/^\d{8}T\d{6}Z$/.test(manifest.version ?? '')) {
  throw new Error('Generated asset manifest has no valid UTC version');
}

const version = manifest.version;
const privateRoot = path.join(dist, 'cos-upload', 'private-root', 'realm', 'catalog');
const publicRoot = path.join(dist, 'cos-upload', 'public-root', 'realm', 'site-catalog');
const privatePointer = await readJson(path.join(privateRoot, 'current.next.json'));
const publicPointer = await readJson(path.join(publicRoot, 'current.next.json'));

if (privatePointer.version !== version || publicPointer.version !== version) {
  throw new Error('Public and private local pointers do not match the generated version');
}

const requiredSections = ['home', 'works', 'collections', 'links', 'audio'];
for (const section of requiredSections) {
  await requireFile(path.join(privateRoot, 'versions', version, `${section}.json`));
}
await requireFile(path.join(publicRoot, 'versions', version, 'assets.json'));

console.log(
  JSON.stringify(
    {
      version,
      manifestEntries: Array.isArray(manifest.assets) ? manifest.assets.length : 0,
      verified: ['local-manifest', 'public-pointer', 'private-pointer', 'catalog-sections'],
    },
    null,
    2,
  ),
);
