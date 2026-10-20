import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const LOGIN_TTL_MS = 10 * 60 * 1000;

export function createPkceLogin() {
  const state = randomBytes(24).toString('base64url');
  const nonce = randomBytes(24).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return {
    state,
    nonce,
    codeVerifier,
    codeChallenge,
    expiresAt: Date.now() + LOGIN_TTL_MS,
  };
}

export function authorizationUrl({ client, clientId, pkce }) {
  const url = new URL(client.authorizationUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: client.redirectUri,
    response_type: 'code',
    scope: client.scope,
    resource: client.resource,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

export function identityFromClaims(claims) {
  const userId = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email : '';
  const roleValue = claims.role;
  const role = Array.isArray(roleValue)
    ? roleValue.find((value) => value === 'owner' || value === 'editor')
    : roleValue === 'owner' || roleValue === 'editor'
      ? roleValue
      : undefined;
  return { userId, email, role };
}

export async function exchangeAuthorizationCode({
  client,
  clientId,
  clientSecret,
  code,
  codeVerifier,
  nonce,
  timeoutMs = 8000,
}) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const response = await fetch(client.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: client.redirectUri,
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (
    !response.ok ||
    typeof body?.access_token !== 'string' ||
    typeof body?.id_token !== 'string'
  ) {
    const error = new Error(
      body?.error_description ?? body?.error ?? 'OIDC token exchange failed.',
    );
    error.status = response.status;
    throw error;
  }
  const jwks = createRemoteJWKSet(new URL(client.jwksUrl));
  const verified = await jwtVerify(body.id_token, jwks, {
    issuer: client.issuer,
    audience: clientId,
  });
  if (verified.payload.nonce !== nonce) {
    throw new Error('OIDC nonce validation failed.');
  }
  const userInfoResponse = await fetch(client.userinfoUrl, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${body.access_token}` },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  const userInfo = await userInfoResponse.json().catch(() => null);
  if (!userInfoResponse.ok || !userInfo) {
    throw new Error('OIDC userinfo request failed.');
  }
  return {
    accessToken: body.access_token,
    ...(typeof body.refresh_token === 'string' ? { refreshToken: body.refresh_token } : {}),
    idToken: body.id_token,
    expiresIn: body.expires_in ?? 3600,
    claims: { ...verified.payload, ...userInfo },
  };
}
