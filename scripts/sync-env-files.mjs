import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALLOWED_KEYS, RETIRED_KEYS, SECTIONS } from './lib/env-registry.mjs';

const DEFAULT_LOCAL_PATH = path.join(process.cwd(), '.env.local');
const DEFAULT_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

function parseArgs(argv) {
  const options = {
    localPath: DEFAULT_LOCAL_PATH,
    examplePath: DEFAULT_EXAMPLE_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--local') {
      options.localPath = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--example') {
      options.examplePath = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function safeRead(filePath) {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function parseEnv(content) {
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    values.set(key, value);
  }
  return values;
}

function renderSectionHeader(title) {
  return [`# ${title}`];
}

function renderComments(comments) {
  return comments.map((comment) => `# ${comment}`);
}

function renderExampleFile() {
  const lines = [];
  for (const section of SECTIONS) {
    if (lines.length > 0) {
      lines.push('');
    }

    lines.push(...renderSectionHeader(section.title));
    for (const entry of section.entries) {
      lines.push(...renderComments(entry.comments));
      const value = entry.exampleValue ?? entry.localDefault ?? '';
      const line = `${entry.key}=${value}`;
      lines.push(entry.commentOutInExample ? `# ${line}` : line);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderLocalFile(currentValues) {
  const managedKeys = new Set();
  const lines = [];
  for (const section of SECTIONS) {
    if (lines.length > 0) {
      lines.push('');
    }

    lines.push(...renderSectionHeader(section.title));
    for (const entry of section.entries) {
      managedKeys.add(entry.key);
      const value = currentValues.has(entry.key)
        ? currentValues.get(entry.key)
        : entry.localDefault;
      lines.push(`${entry.key}=${value ?? ''}`);
    }
  }

  // 保留 .env.local 中不在注册表的未知键（开发者临时调试 env），避免静默清除
  const unmanagedKeys = [...currentValues.keys()]
    .filter((key) => !managedKeys.has(key) && !RETIRED_KEYS.has(key))
    .sort();
  if (unmanagedKeys.length > 0) {
    lines.push('');
    lines.push('# (unmanaged) keys below are not in the env registry; kept as-is');
    for (const key of unmanagedKeys) {
      lines.push(`${key}=${currentValues.get(key)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function collectSummary(currentValues) {
  const currentKeys = new Set(currentValues.keys());
  const kept = [];
  const added = [];

  for (const section of SECTIONS) {
    for (const entry of section.entries) {
      if (currentKeys.has(entry.key)) {
        kept.push(entry.key);
      } else {
        added.push(entry.key);
      }
    }
  }

  const retired = [...currentKeys].filter((key) => RETIRED_KEYS.has(key)).sort();
  const unmanaged = [...currentKeys]
    .filter((key) => !ALLOWED_KEYS.has(key) && !RETIRED_KEYS.has(key))
    .sort();
  return { kept, added, retired, unmanaged };
}

function printSummary(summary) {
  const render = (label, keys) => `${label}: ${keys.length ? keys.join(', ') : '(none)'}`;
  console.log(render('retired keys (removed)', summary.retired));
  console.log(render('unmanaged keys (kept)', summary.unmanaged));
  console.log(render('added keys', summary.added));
  console.log(render('kept keys', summary.kept));
}

async function main() {
  const options = parseArgs(process.argv);
  const localContent = await safeRead(options.localPath);
  const currentValues = parseEnv(localContent);
  const summary = collectSummary(currentValues);

  await writeFile(options.examplePath, renderExampleFile(), 'utf-8');
  await writeFile(options.localPath, renderLocalFile(currentValues), 'utf-8');

  printSummary(summary);
}

main().catch((error) => {
  console.error('[env:sync] FAILED:', error);
  process.exit(1);
});
