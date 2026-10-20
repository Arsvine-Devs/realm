export {
  catalogNamespaces,
  distributionChannels,
  identityOrigins,
  oidcClient,
  revalidateUrls,
  serviceOrigins,
  siteConfig,
  sites,
} from "@arsvine/site-config";

export type PkceLogin = {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly expiresAt: number;
};

export type BrowserLoginResult = {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly idToken: string;
  readonly expiresIn: number;
  readonly claims: Record<string, unknown>;
};

export declare function createPkceLogin(): PkceLogin;

export declare function authorizationUrl(input: {
  client: {
    authorizationUrl: string;
    redirectUri: string;
    scope: string;
    resource: string;
  };
  clientId: string;
  pkce: PkceLogin;
}): string;

export declare function identityFromClaims(claims: Record<string, unknown>): {
  userId: string;
  email: string;
  role: "owner" | "editor" | undefined;
};

export declare function exchangeAuthorizationCode(input: {
  client: {
    tokenUrl: string;
    userinfoUrl: string;
    jwksUrl: string;
    issuer: string;
    redirectUri: string;
  };
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  nonce: string;
  timeoutMs?: number;
}): Promise<BrowserLoginResult>;
export {
  healthHeaders,
  liveBody,
  liveJsonResponse,
  readyBody,
  readyJsonResponse,
} from "@arsvine/service-health";

export declare function catalogPointer(namespace: string): string;

export declare function signRevalidate(
  secret: string,
  timestamp: string,
  body: string,
): string;

export declare function verifyRevalidate(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
  maxSkewMs?: number;
}): boolean;

export declare function fetchClientCredentialsToken(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  resource: string;
  timeoutMs?: number;
}): Promise<{ accessToken: string; expiresIn: number }>;
