import dotenv from 'dotenv';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rawArgs = process.argv.slice(2);
const separator = rawArgs.indexOf('--');
if (separator < 0) {
  throw new Error('Separate runner options from publish flags with --');
}

const runnerArgs = rawArgs.slice(0, separator);
const publishArgs = rawArgs.slice(separator + 1);
const envFileIndex = runnerArgs.indexOf('--env-file');
const envFile = envFileIndex >= 0 ? runnerArgs[envFileIndex + 1] : '.env.local';

if (envFileIndex >= 0 && (!envFile || envFile.startsWith('--'))) {
  throw new Error('--env-file requires a path');
}

const unexpectedRunnerArgs =
  envFileIndex >= 0
    ? runnerArgs.filter((value, index) => value !== '--env-file' && index !== envFileIndex + 1)
    : runnerArgs;
if (unexpectedRunnerArgs.length > 0) {
  throw new Error(`Unknown runner option(s): ${unexpectedRunnerArgs.join(', ')}`);
}

const repoRoot = process.cwd();
const publishScript = path.resolve(repoRoot, 'scripts/assets/publish.mjs');
dotenv.config({ path: path.resolve(repoRoot, envFile), quiet: true });
process.chdir(repoRoot);
process.argv = [process.execPath, publishScript, ...publishArgs];
await import(pathToFileURL(publishScript).href);
