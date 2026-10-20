const origins = Object.freeze({
  realm: 'https://arsvine.com',
  ripple: 'https://ripple.arsvine.com',
  console: 'https://console.arsvine.com',
  auth: 'https://auth.arsvine.com',
  api: 'https://api.arsvine.com',
  content: 'https://content.arsvine.com',
  cdn: 'https://cdn.arsvine.com',
  status: 'https://status.arsvine.com',
  docs: 'https://docs.arsvine.com',
});

const authOrigin = origins.auth;
const authPaths = Object.freeze({
  authorization: `${authOrigin}/api/auth/oauth2/authorize`,
  token: `${authOrigin}/api/auth/oauth2/token`,
  userinfo: `${authOrigin}/api/auth/oauth2/userinfo`,
  jwks: `${authOrigin}/api/auth/jwks`,
  endSession: `${authOrigin}/api/auth/oauth2/end-session`,
});

const consoleScope =
  'openid profile email content:read content:write content:publish assets:read assets:write integrations:read integrations:write jobs:read jobs:run';

/**
 * One record per surface. A new login site adds `capabilities: ["identity"]`
 * and a `login` block. A new download or promo site adds a distribution
 * channel whose subscribers point at records here. Auth resources and
 * revalidation targets are derived from this table.
 */
const siteRecords = {
  realm: {
    id: 'realm',
    origin: origins.realm,
    capabilities: ['revalidate', 'content-read'],
    healthLivePath: '/api/health/live',
    healthReadyPath: '/api/health/ready',
    revalidatePath: '/api/internal/revalidate',
  },
  ripple: {
    id: 'ripple',
    origin: origins.ripple,
    capabilities: ['distribution'],
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
    musicApiPath: '/api/music',
  },
  console: {
    id: 'console',
    origin: origins.console,
    capabilities: ['identity'],
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
    login: {
      redirectPath: '/auth/callback',
      postLogoutPath: '/auth/signed-out',
      resourceId: 'api',
      scope: consoleScope,
    },
  },
  docs: {
    id: 'docs',
    origin: origins.docs,
    capabilities: ['identity'],
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
    login: {
      redirectPath: '/auth/callback',
      postLogoutPath: '/',
      resourceId: 'docs',
      scope: 'openid profile email',
    },
  },
  auth: {
    id: 'auth',
    origin: origins.auth,
    capabilities: ['identity-provider'],
    displayName: 'Arsvine Auth',
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
  },
  api: {
    id: 'api',
    origin: origins.api,
    capabilities: ['resource'],
    displayName: 'Arsvine Control API',
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
  },
  content: {
    id: 'content',
    origin: origins.content,
    capabilities: ['resource'],
    displayName: 'Arsvine Published Content',
    healthLivePath: '/health/live',
    healthReadyPath: '/health/ready',
  },
  cdn: {
    id: 'cdn',
    origin: origins.cdn,
    capabilities: [],
  },
  status: {
    id: 'status',
    origin: origins.status,
    capabilities: [],
  },
};

function freezeSite(site) {
  return Object.freeze({
    ...site,
    capabilities: Object.freeze([...site.capabilities]),
    ...(site.login ? { login: Object.freeze({ ...site.login }) } : {}),
  });
}

export const sites = Object.freeze(
  Object.fromEntries(Object.entries(siteRecords).map(([id, site]) => [id, freezeSite(site)])),
);

function originOf(siteId) {
  const site = siteRecords[siteId];
  if (!site) throw new Error(`Unknown site "${siteId}". Add it to the site registry.`);
  return site.origin;
}

export function oidcClient(siteId) {
  const site = siteRecords[siteId];
  if (!site?.login) {
    throw new Error(`Site "${siteId}" does not accept browser login.`);
  }
  const postLogoutRedirectUri =
    site.login.postLogoutPath === '/' ? site.origin : `${site.origin}${site.login.postLogoutPath}`;
  return Object.freeze({
    issuer: authOrigin,
    authorizationUrl: authPaths.authorization,
    tokenUrl: authPaths.token,
    userinfoUrl: authPaths.userinfo,
    jwksUrl: authPaths.jwks,
    endSessionUrl: authPaths.endSession,
    redirectUri: `${site.origin}${site.login.redirectPath}`,
    postLogoutRedirectUri,
    resource: originOf(site.login.resourceId),
    scope: site.login.scope,
  });
}

const resourceOrigins = Object.values(siteRecords)
  .filter((site) => site.capabilities.includes('resource'))
  .map((site) => site.origin);
const oauthResourceOrigins = [
  ...new Set([
    ...resourceOrigins,
    ...Object.values(siteRecords)
      .filter((site) => site.login)
      .map((site) => originOf(site.login.resourceId)),
  ]),
];

/** Browser origins that may start a login. Auth trusts these without a source edit. */
export const identityOrigins = Object.freeze(
  Object.values(siteRecords)
    .filter((site) => site.capabilities.includes('identity'))
    .map((site) => site.origin),
);

export const distributionChannels = Object.freeze({
  'realm-content': Object.freeze({
    id: 'realm-content',
    namespace: 'realm-content',
    pointerKey: 'realm-content/current.json',
    releasePrefix: 'realm-content/releases',
    subscribers: Object.freeze(['realm']),
  }),
  realm: Object.freeze({
    id: 'realm',
    namespace: 'realm',
    pointerKey: 'realm/catalog/current.json',
    releasePrefix: 'realm/releases',
    subscribers: Object.freeze(['realm']),
  }),
  ripple: Object.freeze({
    id: 'ripple',
    namespace: 'ripple',
    pointerKey: 'ripple/catalog/current.json',
    releasePrefix: 'ripple/releases',
    subscribers: Object.freeze(['ripple']),
  }),
});

export function revalidateUrls(channelId) {
  const channel = distributionChannels[channelId];
  if (!channel) {
    throw new Error(
      `Unknown distribution channel "${channelId}". Register it in distributionChannels.`,
    );
  }
  return Object.freeze(
    channel.subscribers.map((siteId) => {
      const site = siteRecords[siteId];
      if (!site?.revalidatePath) {
        throw new Error(`Subscriber "${siteId}" on channel "${channelId}" has no revalidatePath.`);
      }
      return `${site.origin}${site.revalidatePath}`;
    }),
  );
}

export const serviceOrigins = origins;

export const catalogNamespaces = Object.freeze({
  realmAssets: distributionChannels.realm.namespace,
  realmContent: distributionChannels['realm-content'].namespace,
  ripple: distributionChannels.ripple.namespace,
});

const consoleOidc = oidcClient('console');
const docsOidc = oidcClient('docs');
const contentPointer = distributionChannels['realm-content'].pointerKey;

export const siteConfig = Object.freeze({
  realm: Object.freeze({
    origin: origins.realm,
    revalidateUrl: `${origins.realm}${siteRecords.realm.revalidatePath}`,
    healthLivePath: siteRecords.realm.healthLivePath,
    healthReadyPath: siteRecords.realm.healthReadyPath,
  }),
  ripple: Object.freeze({
    origin: origins.ripple,
    healthLivePath: siteRecords.ripple.healthLivePath,
    healthReadyPath: siteRecords.ripple.healthReadyPath,
    musicPointer: distributionChannels.ripple.pointerKey,
    musicApiPath: siteRecords.ripple.musicApiPath,
  }),
  console: Object.freeze({
    origin: origins.console,
    healthLivePath: siteRecords.console.healthLivePath,
    healthReadyPath: siteRecords.console.healthReadyPath,
    oidc: consoleOidc,
  }),
  auth: Object.freeze({
    origin: authOrigin,
    displayName: siteRecords.auth.displayName,
    issuer: authOrigin,
    jwksUrl: authPaths.jwks,
    audience: Object.freeze(resourceOrigins),
    oauthResources: Object.freeze(oauthResourceOrigins),
    passkeyRpId: new URL(authOrigin).hostname,
    passkeyOrigin: authOrigin,
    healthLivePath: siteRecords.auth.healthLivePath,
    healthReadyPath: siteRecords.auth.healthReadyPath,
  }),
  api: Object.freeze({
    origin: origins.api,
    displayName: siteRecords.api.displayName,
    resource: origins.api,
    healthLivePath: siteRecords.api.healthLivePath,
    healthReadyPath: siteRecords.api.healthReadyPath,
  }),
  content: Object.freeze({
    origin: origins.content,
    displayName: siteRecords.content.displayName,
    resource: origins.content,
    pointerKey: contentPointer,
    publicationUrl: `${origins.content}/v1/internal/publications`,
    healthLivePath: siteRecords.content.healthLivePath,
    healthReadyPath: siteRecords.content.healthReadyPath,
  }),
  cdn: Object.freeze({ origin: origins.cdn }),
  status: Object.freeze({ origin: origins.status }),
  docs: Object.freeze({
    origin: origins.docs,
    healthLivePath: siteRecords.docs.healthLivePath,
    healthReadyPath: siteRecords.docs.healthReadyPath,
    oidc: docsOidc,
  }),
});
