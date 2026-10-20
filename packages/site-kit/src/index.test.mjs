import assert from "node:assert/strict";
import test from "node:test";
import { catalogPointer, signRevalidate, verifyRevalidate } from "./index.mjs";

test("catalog pointer stays inside one namespace", () => {
  assert.equal(catalogPointer("ripple"), "ripple/catalog/current.json");
  assert.throws(() => catalogPointer("realm/../x"));
});

test("revalidation signature accepts the same body and rejects skew", () => {
  const timestamp = String(Date.now());
  const body = JSON.stringify({ event: "content.published" });
  const signature = signRevalidate("secret", timestamp, body);
  assert.equal(verifyRevalidate({ secret: "secret", timestamp, body, signature }), true);
  assert.equal(
    verifyRevalidate({ secret: "secret", timestamp: "1", body, signature, maxSkewMs: 10 }),
    false,
  );
});
