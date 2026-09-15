import dotenv from 'dotenv';
import path from 'node:path';

const DEFAULT_FILES = ['.env.{mode}.local', '.env.local', '.env.{mode}', '.env'];

export function readEnv(name, source = process.env) {
  const value = source[name];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export function requiredEnv(name, source = process.env) {
  const value = readEnv(name, source);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function readEnvList(name, source = process.env) {
  const value = readEnv(name, source);
  if (!value) return undefined;
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function loadProjectEnv({ cwd = process.cwd(), mode = process.env.NODE_ENV } = {}) {
  const normalizedMode = mode === 'production' ? 'production' : 'development';
  const loaded = [];

  for (const template of DEFAULT_FILES) {
    const fileName = template.replace('{mode}', normalizedMode);
    const result = dotenv.config({
      path: path.join(cwd, fileName),
      override: false,
      quiet: true,
    });
    if (!result.error) loaded.push(fileName);
  }

  return { loaded };
}
