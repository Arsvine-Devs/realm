export type ServiceOrigins = {
  readonly realm: string;
  readonly ripple: string;
  readonly console: string;
  readonly auth: string;
  readonly api: string;
  readonly content: string;
  readonly cdn: string;
  readonly status: string;
  readonly docs: string;
};

export type CatalogNamespaces = {
  readonly realmAssets: string;
  readonly realmContent: string;
  readonly ripple: string;
};

export type SiteCapability =
  | "identity"
  | "identity-provider"
  | "resource"
  | "revalidate"
  | "content-read"
  | "distribution";

export type SiteLogin = {
  readonly redirectPath: string;
  readonly postLogoutPath: string;
  readonly resourceId: string;
  readonly scope: string;
};

export type SiteRecord = {
  readonly id: string;
  readonly origin: string;
  readonly capabilities: readonly SiteCapability[];
  readonly displayName?: string;
  readonly healthLivePath?: string;
  readonly healthReadyPath?: string;
  readonly revalidatePath?: string;
  readonly musicApiPath?: string;
  readonly login?: SiteLogin;
};

export type OidcClient = {
  readonly issuer: string;
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly userinfoUrl: string;
  readonly jwksUrl: string;
  readonly endSessionUrl: string;
  readonly redirectUri: string;
  readonly postLogoutRedirectUri: string;
  readonly resource: string;
  readonly scope: string;
};

export type DistributionChannel = {
  readonly id: string;
  readonly namespace: string;
  readonly pointerKey: string;
  readonly releasePrefix: string;
  readonly subscribers: readonly string[];
};

export type SiteConfig = {
  readonly realm: {
    readonly origin: string;
    readonly revalidateUrl: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
  };
  readonly ripple: {
    readonly origin: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
    readonly musicPointer: string;
    readonly musicApiPath: string;
  };
  readonly console: {
    readonly origin: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
    readonly oidc: OidcClient;
  };
  readonly auth: {
    readonly origin: string;
    readonly displayName: string;
    readonly issuer: string;
    readonly jwksUrl: string;
    readonly audience: readonly string[];
    readonly oauthResources: readonly string[];
    readonly passkeyRpId: string;
    readonly passkeyOrigin: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
  };
  readonly api: {
    readonly origin: string;
    readonly displayName: string;
    readonly resource: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
  };
  readonly content: {
    readonly origin: string;
    readonly displayName: string;
    readonly resource: string;
    readonly pointerKey: string;
    readonly publicationUrl: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
  };
  readonly cdn: {
    readonly origin: string;
  };
  readonly status: {
    readonly origin: string;
  };
  readonly docs: {
    readonly origin: string;
    readonly healthLivePath: string;
    readonly healthReadyPath: string;
    readonly oidc: OidcClient;
  };
};

export declare const serviceOrigins: ServiceOrigins;
export declare const catalogNamespaces: CatalogNamespaces;
export declare const siteConfig: SiteConfig;
export declare const sites: Readonly<Record<string, SiteRecord>>;
export declare const identityOrigins: readonly string[];
export declare const distributionChannels: Readonly<Record<string, DistributionChannel>>;
export declare function oidcClient(siteId: string): OidcClient;
export declare function revalidateUrls(channelId: string): readonly string[];
