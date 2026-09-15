import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const contractPath = path.join(root, 'config', 'env-contracts.json');

function fail(message) {
  throw new Error(message);
}

function parseExample(content) {
  const keys = new Set();
  for (const [lineNumber, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*(?:#\s*)?([A-Z][A-Z0-9_]*)\s*=/);
    if (!match) continue;
    if (keys.has(match[1])) fail(`.env.example:${lineNumber + 1} duplicates ${match[1]}`);
    keys.add(match[1]);
  }
  return keys;
}

async function main() {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  if (contract.version !== 1 || !Array.isArray(contract.entries)) {
    fail('config/env-contracts.json must contain version 1 and entries');
  }

  const byKey = new Map();
  for (const entry of contract.entries) {
    if (!entry || typeof entry.key !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(entry.key)) {
      fail('every environment entry needs an uppercase key');
    }
    if (byKey.has(entry.key)) fail(`duplicate registered key: ${entry.key}`);
    if (!Array.isArray(entry.exampleFiles) || !Array.isArray(entry.usedBy)) {
      fail(`${entry.key} needs exampleFiles and usedBy arrays`);
    }
    if (
      !entry.description ||
      !entry.format ||
      !entry.requiredness ||
      !Array.isArray(entry.scopes)
    ) {
      fail(`${entry.key} is missing description, format, requiredness, or scopes`);
    }
    byKey.set(entry.key, entry);
  }

  const examples = new Map();
  for (const entry of contract.entries) {
    for (const file of entry.exampleFiles) {
      if (examples.has(file)) continue;
      const absolute = path.resolve(root, file);
      await access(absolute).catch(() => fail(`missing example file: ${file}`));
      examples.set(file, parseExample(await readFile(absolute, 'utf8')));
    }
    for (const source of entry.usedBy) {
      await access(path.resolve(root, source)).catch(() =>
        fail(`${entry.key} references missing consumer: ${source}`),
      );
    }
  }

  for (const [file, keys] of examples) {
    for (const key of keys) {
      const entry = byKey.get(key);
      if (!entry) fail(`${file} contains unregistered key: ${key}`);
      if (!entry.exampleFiles.includes(file)) fail(`${key} is not registered in ${file}`);
    }
  }
  for (const entry of contract.entries) {
    for (const file of entry.exampleFiles) {
      if (!examples.get(file)?.has(entry.key)) fail(`${entry.key} is missing from ${file}`);
    }
  }

  const sourceOnly = contract.entries.filter((entry) => entry.exampleFiles.length === 0).length;
  console.log(
    `[env:check] verified ${contract.entries.length} registered keys; ${sourceOnly} source-only provider inputs`,
  );
}

main().catch((error) => {
  console.error(`[env:check] FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
