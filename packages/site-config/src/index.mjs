const origins = Object.freeze({
  realm: "https://arsvine.com",
  ripple: "https://ripple.arsvine.com",
  console: "https://console.arsvine.com",
  auth: "https://auth.arsvine.com",
  api: "https://api.arsvine.com",
  content: "https://content.arsvine.com",
  cdn: "https://cdn.arsvine.com",
  status: "https://status.arsvine.com",
  docs: "https://docs.arsvine.com",
});

/** Stable public origins used by every Arsvine site. */
export const serviceOrigins = origins;

/** Immutable Catalog / Content object-key namespaces on CDN or private storage. */
export const catalogNamespaces = Object.freeze({
  realmAssets: "realm",
  realmContent: "realm-content",
  ripple: "ripple",
});

const authOrigin = origins.auth;
const authPaths = Object.freeze({
  authorization: `${authOrigin}/api/auth/oauth2/authorize`,
  token: `${authOrigin}/api/auth/oauth2/token`,
  userinfo: `${authOrigin}/api/auth/oauth2/userinfo`,
  jwks: `${authOrigin}/jwks`,
  endSession: `${authOrigin}/api/auth/oauth2/end-session`,
});

const consoleOrigin = origins.console;
const contentOrigin = origins.content;

export const siteConfig = Object.freeze({
  realm: Object.freeze({
    origin: origins.realm,
    revalidateUrl: `${origins.realm}/api/internal/revalidate`,
    healthLivePath: "/api/health/live",
    healthReadyPath: "/api/health/ready",
  }),
  ripple: Object.freeze({
    origin: origins.ripple,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
    musicPointer: `${catalogNamespaces.ripple}/catalog/current.json`,
    musicApiPath: "/api/music",
  }),
  console: Object.freeze({
    origin: consoleOrigin,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
    oidc: Object.freeze({
      issuer: authOrigin,
      authorizationUrl: authPaths.authorization,
      tokenUrl: authPaths.token,
      userinfoUrl: authPaths.userinfo,
      jwksUrl: authPaths.jwks,
      endSessionUrl: authPaths.endSession,
      redirectUri: `${consoleOrigin}/auth/callback`,
      postLogoutRedirectUri: `${consoleOrigin}/auth/signed-out`,
      resource: origins.api,
      scope:
        "openid profile email content:read content:write content:publish assets:read assets:write integrations:read integrations:write jobs:read jobs:run",
    }),
  }),
  auth: Object.freeze({
    origin: authOrigin,
    displayName: "Arsvine Auth",
    issuer: authOrigin,
    jwksUrl: authPaths.jwks,
    audience: Object.freeze([origins.api, contentOrigin]),
    oauthResources: Object.freeze([origins.api, contentOrigin]),
    passkeyRpId: new URL(authOrigin).hostname,
    passkeyOrigin: authOrigin,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
  }),
  api: Object.freeze({
    origin: origins.api,
    displayName: "Arsvine Control API",
    resource: origins.api,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
  }),
  content: Object.freeze({
    origin: contentOrigin,
    displayName: "Arsvine Published Content",
    resource: contentOrigin,
    pointerKey: `${catalogNamespaces.realmContent}/current.json`,
    publicationUrl: `${contentOrigin}/v1/internal/publications`,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
  }),
  cdn: Object.freeze({ origin: origins.cdn }),
  status: Object.freeze({ origin: origins.status }),
  docs: Object.freeze({
    origin: origins.docs,
    healthLivePath: "/health/live",
    healthReadyPath: "/health/ready",
    oidc: Object.freeze({
      redirectUri: `${origins.docs}/auth/callback`,
      postLogoutRedirectUri: origins.docs,
      resource: origins.docs,
      scope: "openid profile email",
    }),
  }),
});
