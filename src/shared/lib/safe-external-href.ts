const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:'] as const;

export type SafeExternalLinkVariant = 'default' | 'bilibili' | 'github';

export function getSafeExternalUrl(
  value: unknown,
  allowedProtocols: readonly string[] = DEFAULT_ALLOWED_PROTOCOLS,
): URL | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return allowedProtocols.includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function getSafeExternalHref(
  value: unknown,
  allowedProtocols?: readonly string[],
): string | null {
  return getSafeExternalUrl(value, allowedProtocols)?.href ?? null;
}

function isHostnameMatch(hostname: string, expected: string) {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

export function getSafeExternalLinkVariant(url: URL): SafeExternalLinkVariant {
  if (
    isHostnameMatch(url.hostname, 'www.bilibili.com') ||
    isHostnameMatch(url.hostname, 'bilibili.com')
  ) {
    return 'bilibili';
  }

  if (isHostnameMatch(url.hostname, 'github.com')) {
    return 'github';
  }

  return 'default';
}
