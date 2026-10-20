import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogNamespaces,
  distributionChannels,
  identityOrigins,
  oidcClient,
  revalidateUrls,
  serviceOrigins,
  siteConfig,
} from "./index.mjs";

test("published content pointer stays realm-content/current.json", () => {
  assert.equal(catalogNamespaces.realmContent, "realm-content");
  assert.equal(siteConfig.content.pointerKey, "realm-content/current.json");
  assert.equal(
    siteConfig.content.pointerKey,
    `${catalogNamespaces.realmContent}/current.json`,
  );
});

test("a login site is admitted by the registry", () => {
  assert.equal(oidcClient("docs").resource, serviceOrigins.docs);
  assert.equal(oidcClient("console").resource, serviceOrigins.api);
  assert.ok(siteConfig.auth.oauthResources.includes(serviceOrigins.docs));
  assert.ok(siteConfig.auth.oauthResources.includes(serviceOrigins.api));
  assert.ok(siteConfig.auth.oauthResources.includes(serviceOrigins.content));
  assert.deepEqual(siteConfig.auth.audience, [
    serviceOrigins.api,
    serviceOrigins.content,
  ]);
  assert.ok(identityOrigins.includes(serviceOrigins.console));
  assert.ok(identityOrigins.includes(serviceOrigins.docs));
  assert.equal(identityOrigins.includes(serviceOrigins.auth), false);
});

test("distribution subscribers are the revalidation targets", () => {
  assert.deepEqual(revalidateUrls("realm-content"), [
    "https://arsvine.com/api/internal/revalidate",
  ]);
  assert.equal(
    distributionChannels.ripple.pointerKey,
    "ripple/catalog/current.json",
  );
  assert.throws(() => revalidateUrls("ripple"));
});

test("auth JWKS URL is the Better Auth endpoint", () => {
  assert.equal(serviceOrigins.auth, "https://auth.arsvine.com");
  assert.equal(
    siteConfig.auth.jwksUrl,
    "https://auth.arsvine.com/api/auth/jwks",
  );
  assert.equal(siteConfig.console.oidc.jwksUrl, siteConfig.auth.jwksUrl);
  assert.equal(
    siteConfig.console.oidc.tokenUrl,
    `${serviceOrigins.auth}/api/auth/oauth2/token`,
  );
});
