import { readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.vercel',
  '.playwright-cli',
  'node_modules',
  'dist',
  'cos-workspace',
  'coscli_output',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const files = await walk(root);
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const count = (predicate) => files.filter((file) => predicate(relative(file))).length;
const byTopLevel = Object.fromEntries(
  [...new Set(files.map((file) => relative(file).split('/')[0]))]
    .sort()
    .map((name) => [name, count((file) => file === name || file.startsWith(`${name}/`))]),
);

console.log(
  JSON.stringify(
    {
      root,
      trackedSurfaceApproximation: files.length,
      topLevelFiles: byTopLevel,
      tests: count((file) => /(^|\/)tests\/.+\.test\.(?:ts|tsx)$/.test(file)),
      docs: count((file) => /(^|\/)docs\/.+\.md$/.test(file)),
      skills: count((file) => /(^|\/)\.agents\/skills\/.+\/SKILL\.md$/.test(file)),
      scripts: count((file) => /(^|\/)scripts\/.+\.(?:mjs|js|ps1|cmd)$/.test(file)),
    },
    null,
    2,
  ),
);
