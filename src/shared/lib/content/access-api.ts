type AccessApiErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'VALIDATION_FAILED'
  | 'GROUP_NOT_FOUND'
  | 'TOTP_INVALID'
  | 'RATE_LIMITED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_FAILED';

interface AccessApiError {
  code: AccessApiErrorCode;
  message: string;
}

export type GrantCheckResponse =
  { ok: true; granted: boolean } | { ok: false; error: AccessApiError };

export type ProtectedVerifyResponse =
  { ok: true; redirectTo: string } | { ok: false; error: AccessApiError };

const INTERNAL_ORIGIN = 'https://realm.invalid';

export function normalizeNextPath(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    return '/';
  }
  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.pathname.startsWith('//')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
