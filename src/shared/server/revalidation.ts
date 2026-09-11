import { jsonResponse, readJsonObject, secureStringEqual } from './http';

type RevalidationAuthOptions = {
  allowQuerySecret?: boolean;
};

type RevalidationAuthResult =
  { ok: true; body: Record<string, unknown> } | { ok: false; response: Response };

export async function authenticateRevalidation(
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
