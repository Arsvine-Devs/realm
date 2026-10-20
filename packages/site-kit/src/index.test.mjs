import assert from "node:assert/strict";
import test from "node:test";
import { siteConfig } from "@arsvine/site-config";
import {
  catalogPointer,
  fetchClientCredentialsToken,
  signRevalidate,
  verifyRevalidate,
} from "./index.mjs";

test("catalog pointers follow site-config", () => {
  assert.equal(catalogPointer("realm-content"), "realm-content/current.json");
  assert.equal(catalogPointer("realm-content"), siteConfig.content.pointerKey);
  assert.equal(catalogPointer("ripple"), "ripple/catalog/current.json");
  assert.equal(catalogPointer("ripple"), siteConfig.ripple.musicPointer);
  assert.equal(catalogPointer("realm"), "realm/catalog/current.json");
  assert.throws(() => catalogPointer("realm/../x"));
});

test("revalidation signature accepts the same body and rejects skew", () => {
  const timestamp = String(Date.now());
  const body = JSON.stringify({ event: "content.published" });
  const signature = signRevalidate("secret", timestamp, body);
  assert.equal(
    verifyRevalidate({ secret: "secret", timestamp, body, signature }),
    true,
  );
  assert.equal(
    verifyRevalidate({
      secret: "secret",
      timestamp: "1",
      body,
      signature,
      maxSkewMs: 10,
    }),
    false,
  );
});

test("client credentials request uses the token endpoint contract", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({ access_token: "token-value", expires_in: 120 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  try {
    const token = await fetchClientCredentialsToken({
      tokenUrl: siteConfig.console.oidc.tokenUrl,
      clientId: "client-id",
      clientSecret: "client-secret",
      scope: "content:protected:read",
      resource: siteConfig.content.resource,
    });
    assert.equal(token.accessToken, "token-value");
    assert.equal(token.expiresIn, 120);
    assert.equal(calls[0]?.url, "https://auth.arsvine.com/api/auth/oauth2/token");
    const params = new URLSearchParams(String(calls[0]?.init?.body));
    assert.equal(params.get("grant_type"), "client_credentials");
    assert.equal(params.get("scope"), "content:protected:read");
    assert.equal(params.get("resource"), "https://content.arsvine.com");
  } finally {
    globalThis.fetch = original;
  }
});
