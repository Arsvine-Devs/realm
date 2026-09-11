const SAFE_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const URI_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
// Control characters are rejected before a user-controlled href is parsed.
// oxlint-disable-next-line eslint/no-control-regex -- matching C0 controls is the security contract here.
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

export function getSafeMdxHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (
    !trimmed ||
    CONTROL_CHARACTER_PATTERN.test(trimmed) ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\')
  ) {
    return null;
  }

  if (!URI_SCHEME_PATTERN.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    return SAFE_ABSOLUTE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
