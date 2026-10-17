const NO_STORE = Object.freeze({ "Cache-Control": "no-store" });

/**
 * @param {string} service
 * @param {Record<string, unknown>} [extra]
 */
export function liveBody(service, extra = {}) {
  return Object.freeze({ status: "live", service, ...extra });
}

/**
 * @param {string} service
 * @param {Record<string, unknown>} [extra]
 */
export function readyBody(service, extra = {}) {
  return Object.freeze({ status: "ready", service, ...extra });
}

/**
 * @param {string} service
 * @param {Record<string, unknown>} [extra]
 */
export function liveJsonResponse(service, extra = {}) {
  return Response.json(liveBody(service, extra), { headers: NO_STORE });
}

/**
 * @param {string} service
 * @param {Record<string, unknown>} [extra]
 */
export function readyJsonResponse(service, extra = {}) {
  return Response.json(readyBody(service, extra), { headers: NO_STORE });
}

export const healthHeaders = NO_STORE;
