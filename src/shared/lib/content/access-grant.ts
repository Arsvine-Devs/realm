import { createHmac, timingSafeEqual } from 'node:crypto';
import { readEnv } from '@/shared/config/env-provider';

const ACCESS_COOKIE_NAME = 'arsvine_post_access';
const ACCESS_GRANT_TTL_MS = 60 * 60 * 1000;

type AccessGrantPayload = {
  group: string;
  exp: number;
  sig: string;
};

function getSecret() {
  const secret = readEnv('ACCESS_GRANT_SECRET');
  if (!secret) {
    throw new Error('Missing ACCESS_GRANT_SECRET');
  }
  return secret;
}

function sign(group: string, exp: number) {
  return createHmac('sha256', getSecret()).update(`${group}:${exp}`).digest('base64url');
}

export function createAccessGrant(group: string, ttlMs = ACCESS_GRANT_TTL_MS) {
  const exp = Date.now() + ttlMs;
  const payload: AccessGrantPayload = {
    group,
    exp,
    sig: sign(group, exp),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeGrant(value: string): AccessGrantPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as AccessGrantPayload;
    if (
      !parsed ||
      typeof parsed.group !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.sig !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function verifyAccessGrant(rawValue: string | undefined, group: string) {
  if (!rawValue) return false;

  const payload = decodeGrant(rawValue);
  if (!payload) return false;
  if (payload.group !== group) return false;
  if (payload.exp <= Date.now()) return false;

  const expected = sign(payload.group, payload.exp);
  const left = Buffer.from(payload.sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export function getAccessGrantCookieName() {
  return ACCESS_COOKIE_NAME;
}

export function createAccessGrantCookie(group: string, ttlMs = ACCESS_GRANT_TTL_MS) {
  const value = createAccessGrant(group, ttlMs);
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${ACCESS_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return cookie;
}

export function createClearedAccessGrantCookie() {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${ACCESS_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return cookie;
}

export function hasValidAccessGrant(
  req: { cookies: Partial<Record<string, string>> },
  group: string,
) {
  return verifyAccessGrant(req.cookies[ACCESS_COOKIE_NAME], group);
}
