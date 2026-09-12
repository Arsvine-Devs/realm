import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse, readJsonObject, secureStringEqual } from './http';

type RevalidationAuthOptions = {
  allowQuerySecret?: boolean;
};

type RevalidationAuthResult =
  { ok: true; body: Record<string, unknown> } | { ok: false; response: Response };

type RevalidationRequestOptions = RevalidationAuthOptions & {
  limiterName: string;
};

async function authenticateRevalidation(
  request: Request,
  options: RevalidationAuthOptions = {},
): Promise<RevalidationAuthResult> {
  const body = request.method === 'POST' ? await readJsonObject(request) : {};
  const bodySecret = typeof body.secret === 'string' ? body.secret : '';
  const querySecret = options.allowQuerySecret
    ? (new URL(request.url).searchParams.get('secret') ?? '')
    : '';
  const provided = bodySecret || querySecret;
  const expected = process.env.REVALIDATE_SECRET?.trim() ?? '';

  if (!expected || !provided || !secureStringEqual(provided, expected)) {
    return {
      ok: false,
      response: jsonResponse({ message: 'Invalid token' }, { status: 401 }),
    };
  }

  return { ok: true, body };
}

export async function withRevalidationRequest(
  request: Request,
  options: RevalidationRequestOptions,
  handler: (body: Record<string, unknown>) => Promise<Response> | Response,
): Promise<Response> {
  const limiter = await enforceRateLimit(
    `${options.limiterName}:${getClientAddress(request)}`,
    30,
    60_000,
  );
  if (!limiter.ok) {
    return jsonResponse(
      { message: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)) },
      },
    );
  }

  const auth = await authenticateRevalidation(request, options);
  if (!auth.ok) return auth.response;
  return handler(auth.body);
}
