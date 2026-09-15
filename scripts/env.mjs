import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

const root = process.cwd();
const contractPath = path.join(root, 'config', 'env-contracts.json');

function parseArgs(argv) {
  const commandIndex = argv[2] === '--' ? 3 : 2;
  const command = argv[commandIndex] ?? 'help';
  const flags = new Map();
  for (let index = commandIndex + 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const separator = argument.indexOf('=');
    const key = separator === -1 ? argument.slice(2) : argument.slice(2, separator);
    let value = separator === -1 ? undefined : argument.slice(separator + 1);
    if (value === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }
    const values = flags.get(key) ?? [];
    values.push(value ?? 'true');
    flags.set(key, values);
  }
  return { command, flags };
}

function values(flags, name) {
  return (flags.get(name) ?? []).flatMap((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function one(flags, name) {
  return values(flags, name)[0];
}

function isFlag(flags, name) {
  return flags.has(name) && values(flags, name).at(-1) === 'true';
}

function hasValue(environment, key) {
  return typeof environment?.[key] === 'string' && environment[key].trim() !== '';
}

async function loadContract() {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  if (contract.version !== 1 || !Array.isArray(contract.entries))
    throw new Error('Invalid config/env-contracts.json');
  return contract;
}

async function localValues() {
  try {
    return dotenv.parse(await readFile(path.join(root, '.env.local'), 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return {};
    throw error;
  }
}

function printHelp() {
  console.log(`Environment provider CLI

Commands:
  envctl stats
  envctl query --key NAME
  envctl register --key NAME --section SECTION --description TEXT --format TEXT
    --used-by PATH --scope local,preview,production [--example VALUE]
    [--requiredness required|optional|conditional] [--secret] [--commented]
    [--source-only]

Queries never print environment values. Registration updates the contract and
appends a documented entry to .env.example unless --source-only is used.`);
}

async function stats(contract) {
  const local = await localValues();
  const entries = contract.entries;
  const configured = entries.filter((entry) => hasValue(local, entry.key)).length;
  const counts = {
    registered: entries.length,
    configured,
    required: entries.filter((entry) => entry.requiredness === 'required').length,
    conditional: entries.filter((entry) => entry.requiredness === 'conditional').length,
    optional: entries.filter((entry) => entry.requiredness === 'optional').length,
    secret: entries.filter((entry) => entry.secret).length,
    sourceOnly: entries.filter((entry) => entry.exampleFiles.length === 0).length,
  };
  console.log(
    `[env] registered=${counts.registered} configured=${counts.configured} required=${counts.required} conditional=${counts.conditional} optional=${counts.optional} secret=${counts.secret} source-only=${counts.sourceOnly}`,
  );
}

async function query(contract, flags) {
  const key = one(flags, 'key');
  if (!key) throw new Error('query requires --key NAME');
  const entry = contract.entries.find((item) => item.key === key);
  if (!entry) throw new Error(`Unregistered environment key: ${key}`);
  const local = await localValues();
  console.log(`key: ${entry.key}`);
  console.log('owner: Realm');
  console.log(`requiredness: ${entry.requiredness}`);
  console.log(`format: ${entry.format}`);
  console.log(`secret: ${entry.secret ? 'yes' : 'no'}`);
  console.log(`scopes: ${entry.scopes.join(', ')}`);
  console.log(`description: ${entry.description}`);
  console.log(`failure behavior: ${entry.failureBehavior}`);
  console.log(`consumers: ${entry.usedBy.join(', ')}`);
  console.log(
    `example files: ${entry.exampleFiles.length ? entry.exampleFiles.join(', ') : '(source-only)'}`,
  );
  console.log(`local status: ${hasValue(local, key) ? 'set' : 'unset'}`);
}

async function register(contract, flags) {
  const key = one(flags, 'key');
  const section = one(flags, 'section');
  const description = one(flags, 'description');
  const format = one(flags, 'format');
  const usedBy = values(flags, 'used-by');
  const scopes = values(flags, 'scope');
  const sourceOnly = isFlag(flags, 'source-only');
  const example = one(flags, 'example');
  const requiredness = one(flags, 'requiredness') ?? 'optional';
  if (!key || !/^[A-Z][A-Z0-9_]*$/.test(key))
    throw new Error('--key must be an uppercase environment name');
  if (contract.entries.some((entry) => entry.key === key))
    throw new Error(`Already registered: ${key}`);
  if (!section || !description || !format || usedBy.length === 0 || scopes.length === 0) {
    throw new Error('register requires --section, --description, --format, --used-by, and --scope');
  }
  if (!['required', 'optional', 'conditional'].includes(requiredness))
    throw new Error('invalid --requiredness');
  if (!sourceOnly && example === undefined)
    throw new Error('register requires a safe --example value unless --source-only is used');
  for (const source of usedBy)
    await access(path.resolve(root, source)).catch(() => {
      throw new Error(`missing consumer: ${source}`);
    });

  const entry = {
    key,
    section,
    exampleFiles: sourceOnly ? [] : ['.env.example'],
    commented: !sourceOnly && isFlag(flags, 'commented'),
    requiredness,
    secret: isFlag(flags, 'secret'),
    format,
    ...(example === undefined ? {} : { example }),
    localDefault: '',
    scopes,
    usedBy,
    description,
    failureBehavior:
      one(flags, 'failure') ?? 'The consuming code reports the configuration failure.',
  };
  contract.entries.push(entry);
  await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');

  if (!sourceOnly) {
    const block = [
      `# ${key}: ${description}`,
      `# Format: ${format}`,
      `# Scope: ${scopes.join(', ')}`,
      `# Secret: ${entry.secret ? 'keep in an untracked file' : 'no'}`,
      `${entry.commented ? '# ' : ''}${key}=${example}`,
      '',
    ].join('\n');
    const examplePath = path.join(root, '.env.example');
    const current = await readFile(examplePath, 'utf8');
    await writeFile(examplePath, `${current.trimEnd()}\n\n${block}`, 'utf8');
  }
  console.log(
    `[env] registered ${key}; secret=${entry.secret ? 'yes' : 'no'}; source-only=${sourceOnly ? 'yes' : 'no'}`,
  );
}

async function main() {
  const { command, flags } = parseArgs(process.argv);
  const contract = await loadContract();
  if (command === 'stats') return stats(contract);
  if (command === 'query') return query(contract, flags);
  if (command === 'register') return register(contract, flags);
  printHelp();
}

main().catch((error) => {
  console.error(`[env] FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
