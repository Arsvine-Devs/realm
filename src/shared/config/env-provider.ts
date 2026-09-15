export type EnvSource = Record<string, string | undefined>;

export function readEnv(name: string, source: EnvSource = process.env) {
  const value = source[name];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}
