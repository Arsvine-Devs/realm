import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.join(process.cwd(), 'src');

const animationKeywords = new Set([
  'alternate',
  'alternate-reverse',
  'backwards',
  'both',
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'forwards',
  'infinite',
  'inherit',
  'initial',
  'linear',
  'none',
  'normal',
  'paused',
  'reverse',
  'revert',
  'revert-layer',
  'running',
  'step-end',
  'step-start',
  'unset',
]);

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const listCssModules = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listCssModules(entryPath);
    return entry.name.endsWith('.module.scss') ? [entryPath] : [];
  });

const resolveUse = (fromFile: string, request: string): string | null => {
  if (request.startsWith('sass:')) return null;

  const target = path.resolve(path.dirname(fromFile), request);
  const extension = path.extname(target);
  const directory = path.dirname(target);
  const basename = path.basename(target, extension);
  const candidates = extension
    ? [target, path.join(directory, `_${basename}${extension}`)]
    : [
        `${target}.scss`,
        path.join(directory, `_${basename}.scss`),
        path.join(target, '_index.scss'),
        path.join(target, 'index.scss'),
      ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const collectModuleSource = (entryFile: string): string => {
  const visited = new Set<string>();
  const sources: string[] = [];

  const visit = (file: string) => {
    const normalized = path.normalize(file);
    if (visited.has(normalized)) return;
    visited.add(normalized);

    const source = stripComments(readFileSync(normalized, 'utf8'));
    sources.push(source);

    for (const match of source.matchAll(/@use\s+['"]([^'"]+)['"]/g)) {
      const dependency = resolveUse(normalized, match[1]);
      if (dependency) visit(dependency);
    }
  };

  visit(entryFile);
  return sources.join('\n');
};

const splitTopLevelCommas = (value: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
};

const shorthandAnimationName = (value: string): string | null => {
  const normalized = value
    .replace(/!important/g, '')
    .replace(/\b(?:cubic-bezier|steps|var)\([^)]*\)/g, '')
    .replace(/\$[-_a-zA-Z0-9]+/g, '')
    .replace(/-?(?:\d*\.)?\d+m?s\b/g, '');

  const identifiers = normalized.match(/-?[_a-zA-Z][_a-zA-Z0-9-]*/g) ?? [];
  return identifiers.find((identifier) => !animationKeywords.has(identifier)) ?? null;
};

const collectAnimationReferences = (source: string): Set<string> => {
  const references = new Set<string>();

  for (const match of source.matchAll(/\banimation-name\s*:\s*([^;{}]+)/g)) {
    for (const value of splitTopLevelCommas(match[1])) {
      const name = value
        .trim()
        .replace(/!important$/, '')
        .trim();
      if (name && !animationKeywords.has(name)) references.add(name);
    }
  }

  for (const match of source.matchAll(/\banimation\s*:\s*([^;{}]+)/g)) {
    for (const value of splitTopLevelCommas(match[1])) {
      const name = shorthandAnimationName(value);
      if (name) references.add(name);
    }
  }

  return references;
};

describe('CSS Module animation contracts', () => {
  it('defines every referenced animation inside the module dependency graph', () => {
    const missingByModule = listCssModules(sourceRoot).flatMap((modulePath) => {
      const source = collectModuleSource(modulePath);
      const definitions = new Set(
        [...source.matchAll(/@keyframes\s+(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((match) => match[1]),
      );
      const missing = [...collectAnimationReferences(source)]
        .filter((name) => !definitions.has(name))
        .sort();

      return missing.length > 0
        ? [`${path.relative(process.cwd(), modulePath)}: ${missing.join(', ')}`]
        : [];
    });

    expect(missingByModule).toEqual([]);
  });
});
