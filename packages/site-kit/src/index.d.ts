export { catalogNamespaces, serviceOrigins, siteConfig } from "@arsvine/site-config";
export {
  healthHeaders,
  liveBody,
  liveJsonResponse,
  readyBody,
  readyJsonResponse,
} from "@arsvine/service-health";

export declare function catalogPointer(namespace: string): string;

export declare function signRevalidate(secret: string, timestamp: string, body: string): string;

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
