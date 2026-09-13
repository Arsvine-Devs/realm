import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  '.next',
  'coverage',
  'dist',
  'cos-workspace',
]);

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectMarkdownFiles(path.join(directory, entry.name))));
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function isExternalTarget(target) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target) || target.startsWith('/');
}

function normalizeTarget(rawTarget) {
  const target = rawTarget.trim();
  if (!target || isExternalTarget(target)) return null;

  const withoutAnchor = target.split('#', 1)[0].split('?', 1)[0];
  if (!withoutAnchor) return null;

  try {
    return decodeURIComponent(withoutAnchor);
  } catch {
    return withoutAnchor;
  }
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function localTargets(source) {
  const targets = [];
  const patterns = [/\]\(\s*(?:<([^>]+)>|([^\s)]+))/g, /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const rawTarget = match[1] ?? match[2];
      const target = normalizeTarget(rawTarget);
      if (target) targets.push({ offset: match.index ?? 0, target });
    }
  }

  return targets;
}

function isInsideRoot(candidate) {
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  return candidate === root || candidate.startsWith(rootWithSeparator);
}

async function checkFile(file) {
  const source = await readFile(file, 'utf8');
  const seen = new Set();
  const errors = [];
  const edges = [];
  let localLinkCount = 0;

  for (const { offset, target } of localTargets(source)) {
    const identity = `${offset}:${target}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    localLinkCount += 1;

    const candidate = path.resolve(path.dirname(file), target);
    const location = `${path.relative(root, file)}:${lineNumber(source, offset)}`;
    if (!isInsideRoot(candidate)) {
      errors.push(`${location} points outside the repository: ${target}`);
      continue;
    }
    if (candidate.toLowerCase().endsWith('.md')) edges.push(candidate);

    try {
      await access(candidate);
    } catch {
      errors.push(`${location} points to a missing path: ${target}`);
    }
  }

  return { errors, edges, localLinkCount };
}

const files = await collectMarkdownFiles(root);
const results = await Promise.all(files.map(checkFile));
const errors = results.flatMap((result) => result.errors);
const localLinkCount = results.reduce((total, result) => total + result.localLinkCount, 0);
const graph = new Map(files.map((file) => [path.resolve(file), new Set()]));

for (const [index, result] of results.entries()) {
  const source = path.resolve(files[index]);
  const targets = graph.get(source);
  for (const target of result.edges) targets?.add(path.resolve(target));
}

function addBidirectionalPair(pairs, left, right) {
  pairs.push([path.resolve(root, left), path.resolve(root, right)]);
}

const navigationPairs = [];
addBidirectionalPair(navigationPairs, 'README.md', 'INDEX.md');
addBidirectionalPair(navigationPairs, 'README.md', 'docs/README.md');
addBidirectionalPair(navigationPairs, 'INDEX.md', 'docs/README.md');
addBidirectionalPair(navigationPairs, 'INDEX.md', 'docs/INDEX.md');
addBidirectionalPair(navigationPairs, 'docs/README.md', 'docs/INDEX.md');
addBidirectionalPair(navigationPairs, 'docs/README.md', 'docs/ai/INDEX.md');
addBidirectionalPair(navigationPairs, 'docs/INDEX.md', 'docs/ai/INDEX.md');
addBidirectionalPair(navigationPairs, 'scripts/README.md', 'scripts/images/README.md');
addBidirectionalPair(navigationPairs, 'src/app/README.md', 'INDEX.md');
addBidirectionalPair(navigationPairs, 'src/features/README.md', 'INDEX.md');
addBidirectionalPair(navigationPairs, 'src/features/assets/README.md', 'src/features/README.md');
addBidirectionalPair(navigationPairs, 'src/features/blog/README.md', 'src/features/README.md');
addBidirectionalPair(
  navigationPairs,
  'src/features/navigation/README.md',
  'src/features/README.md',
);
addBidirectionalPair(navigationPairs, 'src/shared/README.md', 'INDEX.md');
addBidirectionalPair(navigationPairs, 'scripts/README.md', 'INDEX.md');
addBidirectionalPair(navigationPairs, 'tests/README.md', 'INDEX.md');

for (const file of files) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (relative.startsWith('docs/human/') && relative !== 'docs/human/README.md') {
    addBidirectionalPair(navigationPairs, 'docs/INDEX.md', relative);
  }
  if (relative.startsWith('docs/ai/') && relative !== 'docs/ai/INDEX.md') {
    addBidirectionalPair(navigationPairs, 'docs/ai/INDEX.md', relative);
  }
}

addBidirectionalPair(
  navigationPairs,
  'docs/ai/INDEX.md',
  '.agents/skills/realm-maintenance-audit/SKILL.md',
);
addBidirectionalPair(
  navigationPairs,
  'docs/ai/INDEX.md',
  '.agents/skills/realm-assets-catalog/SKILL.md',
);
addBidirectionalPair(
  navigationPairs,
  'docs/ai/INDEX.md',
  '.agents/skills/realm-protected-content/SKILL.md',
);

const navigationErrors = [];
for (const [left, right] of navigationPairs) {
  if (!graph.has(left) || !graph.has(right)) {
    navigationErrors.push(
      `navigation pair references a missing Markdown file: ${path.relative(root, left)} <-> ${path.relative(root, right)}`,
    );
    continue;
  }
  if (!graph.get(left)?.has(right)) {
    navigationErrors.push(
      `missing return link: ${path.relative(root, left)} -> ${path.relative(root, right)}`,
    );
  }
  if (!graph.get(right)?.has(left)) {
    navigationErrors.push(
      `missing return link: ${path.relative(root, right)} -> ${path.relative(root, left)}`,
    );
  }
}

errors.push(...navigationErrors);

if (errors.length > 0) {
  console.error(`[docs:check] ${errors.length} broken local link(s) found:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `[docs:check] checked ${files.length} Markdown files, ${localLinkCount} local link(s), and ${navigationPairs.length} bidirectional navigation pair(s)`,
  );
}
