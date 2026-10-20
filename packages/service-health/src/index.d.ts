export declare function liveBody(
  service: string,
  extra?: Record<string, unknown>,
): Readonly<{ status: "live"; service: string } & Record<string, unknown>>;

export declare function readyBody(
  service: string,
  extra?: Record<string, unknown>,
): Readonly<{ status: "ready"; service: string } & Record<string, unknown>>;

export declare function liveJsonResponse(
  service: string,
  extra?: Record<string, unknown>,
): Response;

export declare function readyJsonResponse(
  service: string,
  extra?: Record<string, unknown>,
): Response;

export declare const healthHeaders: Readonly<{ "Cache-Control": string }>;
