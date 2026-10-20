import { createHmac, timingSafeEqual } from "node:crypto";
import { catalogNamespaces, serviceOrigins, siteConfig } from "@arsvine/site-config";

export { catalogNamespaces, serviceOrigins, siteConfig };
export {
  healthHeaders,
  liveBody,
  liveJsonResponse,
  readyBody,
  readyJsonResponse,
} from "@arsvine/service-health";

export function catalogPointer(namespace) {
  if (!namespace || namespace.includes("/") || namespace.includes("..")) {
    throw new Error("Catalog namespace must be a single path segment.");
  }
  return `${namespace}/catalog/current.json`;
}

export function signRevalidate(secret, timestamp, body) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyRevalidate({ secret, timestamp, body, signature, maxSkewMs = 5 * 60 * 1000 }) {
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > maxSkewMs) return false;
  const expected = signRevalidate(secret, timestamp, body);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function fetchClientCredentialsToken({
  tokenUrl,
  clientId,
  clientSecret,
  scope,
  resource,
  timeoutMs = 8000,
}) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope,
      resource,
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.access_token !== "string") {
    const error = new Error(body?.error_description ?? body?.error ?? `Token endpoint returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in ?? 300,
  };
}
