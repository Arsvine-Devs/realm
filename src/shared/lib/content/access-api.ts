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

export function normalizeNextPath(value: unknown) {
  if (typeof value !== 'string') {
    return '/';
  }
  if (!value.startsWith('/')) {
    return '/';
  }
  if (value.startsWith('//')) {
    return '/';
  }
  return value;
}
