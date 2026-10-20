import { createHmac, timingSafeEqual } from 'node:crypto';
import { distributionChannels } from '@arsvine/site-config';

export {
  catalogNamespaces,
  distributionChannels,
  identityOrigins,
  oidcClient,
  revalidateUrls,
  serviceOrigins,
  siteConfig,
  sites,
} from '@arsvine/site-config';
export {
  authorizationUrl,
  createPkceLogin,
  exchangeAuthorizationCode,
  identityFromClaims,
} from './login.mjs';
export {
  healthHeaders,
  liveBody,
  liveJsonResponse,
  readyBody,
  readyJsonResponse,
} from '@arsvine/service-health';

/**
 * Resolve a catalog or content pointer owned by `@arsvine/site-config`.
 * Published Realm content is `realm-content/current.json`, not a `/catalog/` key.
 * @param {string} namespace
 */
export function catalogPointer(namespace) {
  if (!namespace || namespace.includes('/') || namespace.includes('..')) {
    throw new Error('Catalog namespace must be a single path segment.');
  }
  const channel = distributionChannels[namespace];
  if (!channel) {
    throw new Error(
      `Unknown distribution channel "${namespace}". Register it before reading its pointer.`,
    );
  }
  return channel.pointerKey;
}

/**
 * @param {string} secret
 * @param {string} timestamp
 * @param {string} body
 */
export function signRevalidate(secret, timestamp, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * @param {{
 *   secret: string,
 *   timestamp: string,
 *   body: string,
 *   signature: string,
 *   maxSkewMs?: number,
 * }} input
 */
export function verifyRevalidate({
  secret,
  timestamp,
  body,
  signature,
  maxSkewMs = 5 * 60 * 1000,
}) {
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > maxSkewMs) return false;
  const expected = signRevalidate(secret, timestamp, body);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

/**
 * @param {{
 *   tokenUrl: string,
 *   clientId: string,
 *   clientSecret: string,
 *   scope: string,
 *   resource: string,
 *   timeoutMs?: number,
 * }} input
 */
export async function fetchClientCredentialsToken({
  tokenUrl,
  clientId,
  clientSecret,
  scope,
  resource,
  timeoutMs = 8000,
}) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope,
      resource,
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.access_token !== 'string') {
    const error = new Error(
      body?.error_description ?? body?.error ?? `Token endpoint returned ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }
  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in ?? 300,
  };
}
