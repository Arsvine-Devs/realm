import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

async function readContract() {
  const filePath = path.join(process.cwd(), 'config', 'env-contracts.json');
  const contract = JSON.parse(await readFile(filePath, 'utf-8'));
  if (contract.version !== 1 || !Array.isArray(contract.entries)) {
    throw new Error('config/env-contracts.json must contain version 1 and entries');
  }
  return contract;
}

function parseEnv(content) {
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    values.set(key, value);
  }
  return values;
}

function groupEntries(entries) {
  const sections = [];
  const byTitle = new Map();
  for (const entry of entries) {
    let section = byTitle.get(entry.section);
    if (!section) {
      section = { title: entry.section, entries: [] };
      byTitle.set(entry.section, section);
      sections.push(section);
    }
    section.entries.push(entry);
  }
  return sections;
}

function renderComments(entry) {
  const lines = [`# ${entry.description}`, `# Format: ${entry.format}`];
  if (entry.secret) lines.push('# Secret: keep this value in an untracked environment file.');
  if (entry.scopes?.length) lines.push(`# Scope: ${entry.scopes.join(', ')}`);
  return lines;
}

function renderExampleFile(entries) {
  const lines = [];
  for (const section of groupEntries(entries.filter((entry) => entry.exampleFiles.length > 0))) {
    if (lines.length > 0) lines.push('');
    lines.push(`# ${section.title}`);
    for (const entry of section.entries) {
      lines.push(...renderComments(entry));
      const value = entry.example ?? '';
      const line = `${entry.key}=${value}`;
      lines.push(entry.commented ? `# ${line}` : line);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderLocalFile(entries, currentValues) {
  const lines = [];
  for (const section of groupEntries(entries)) {
    if (lines.length > 0) lines.push('');
    lines.push(`# ${section.title}`);
    for (const entry of section.entries) {
      const value = currentValues.has(entry.key)
        ? currentValues.get(entry.key)
        : (entry.localDefault ?? '');
      lines.push(`${entry.key}=${value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function collectSummary(entries, currentValues) {
  const registered = new Set(entries.map((entry) => entry.key));
  const removed = [...currentValues.keys()].filter((key) => !registered.has(key)).sort();
  const kept = [...currentValues.keys()].filter((key) => registered.has(key)).sort();
  const added = entries.filter((entry) => !currentValues.has(entry.key)).map((entry) => entry.key);
  return { added, kept, removed };
}

function printSummary(summary) {
  const render = (label, keys) => `${label}: ${keys.length ? keys.join(', ') : '(none)'}`;
  console.log(render('removed unregistered keys', summary.removed));
  console.log(render('added keys', summary.added));
  console.log(render('kept keys', summary.kept));
}

async function main() {
  const options = parseArgs(process.argv);
  const contract = await readContract();
  const localContent = await safeRead(options.localPath);
  const currentValues = parseEnv(localContent);
  const summary = collectSummary(contract.entries, currentValues);

  await writeFile(options.examplePath, renderExampleFile(contract.entries), 'utf-8');
  await writeFile(options.localPath, renderLocalFile(contract.entries, currentValues), 'utf-8');
  printSummary(summary);
}

main().catch((error) => {
  console.error('[env:sync] FAILED:', error);
  process.exit(1);
});
