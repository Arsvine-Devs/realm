import { createHmac } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { readEnv } from '@/shared/config/env-provider';
import { locales } from '@/shared/contracts/locale';
import { getAssetRevalidationPaths as getPortfolioPaths } from '@/features/portfolio/contracts/data';
import { getAssetRevalidationPaths as getLifePaths } from '@/features/life/contracts/data';
import { jsonResponse, secureStringEqual } from '@/shared/server/http';

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;
const TIMESTAMP_HEADER = 'x-arsvine-timestamp';
const SIGNATURE_HEADER = 'x-arsvine-signature';
const POST_RESOURCE_PATTERN = /^posts:([a-z0-9]+(?:-[a-z0-9]+)*)$/;

type RevalidationEvent = {
  event: 'content.published' | 'assets.published';
  releaseId: string;
  resources: string[];
  timestamp: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSecret() {
  return readEnv('REVALIDATE_WEBHOOK_SECRET') ?? '';
}

function readTimestamp(value: string | null) {
  if (!value || !/^\d{13}$/.test(value)) return null;
  const timestamp = Number(value);
  return Math.abs(Date.now() - timestamp) <= MAX_TIMESTAMP_SKEW_MS ? timestamp : null;
}

function readEvent(value: unknown): RevalidationEvent | null {
  if (!isRecord(value)) return null;
  const event = value.event;
  if (event !== 'content.published' && event !== 'assets.published') return null;
  if (
    typeof value.releaseId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.releaseId)
  ) {
    return null;
  }
  if (
    !Array.isArray(value.resources) ||
    value.resources.length > 256 ||
    value.resources.some((resource) => typeof resource !== 'string')
  ) {
    return null;
  }
  const resources = value.resources as string[];
  if (
    event === 'content.published' &&
    resources.some((resource) => resource !== 'tweets' && !POST_RESOURCE_PATTERN.test(resource))
  ) {
    return null;
  }
  if (event === 'assets.published' && resources.some((resource) => resource !== 'assets')) {
    return null;
  }
  if (typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp))) {
    return null;
  }
  return {
    event,
    releaseId: value.releaseId,
    resources,
    timestamp: value.timestamp,
  };
}

function verifyRequest(request: Request, rawBody: string) {
  const secret = readSecret();
  const timestampHeader = request.headers.get(TIMESTAMP_HEADER);
  const timestamp = readTimestamp(timestampHeader);
  const signature = request.headers.get(SIGNATURE_HEADER)?.trim() ?? '';
  if (!secret || timestamp === null || !/^[a-f0-9]{64}$/.test(signature)) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');
  return secureStringEqual(signature, expected);
}

function pathsForEvent(event: RevalidationEvent) {
  const paths = new Set<string>();
  if (event.event === 'assets.published') {
    for (const locale of locales) {
      paths.add(`/${locale}`);
      paths.add(`/${locale}/content`);
      paths.add(`/${locale}/friends`);
      for (const path of getPortfolioPaths(locale)) paths.add(path);
      for (const path of getLifePaths(locale)) paths.add(path);
    }
    return [...paths];
  }

  for (const locale of locales) {
    paths.add(`/${locale}/content`);
    paths.add(`/${locale}/tweets`);
  }
  for (const resource of event.resources) {
    const match = POST_RESOURCE_PATTERN.exec(resource);
    if (!match) continue;
    for (const locale of locales) paths.add(`/${locale}/blog/${match[1]}`);
  }
  return [...paths];
}

export default async function handler(request: Request) {
  const rawBody = await request.text();
  if (!verifyRequest(request, rawBody)) {
    return jsonResponse({ error: { code: 'INVALID_SIGNATURE' } }, { status: 401 });
  }

  let event: RevalidationEvent | null = null;
  try {
    event = readEvent(JSON.parse(rawBody) as unknown);
  } catch {
    event = null;
  }
  if (!event) {
    return jsonResponse({ error: { code: 'INVALID_EVENT' } }, { status: 422 });
  }

  const bodyTimestamp = Date.parse(event.timestamp);
  if (Math.abs(Date.now() - bodyTimestamp) > MAX_TIMESTAMP_SKEW_MS) {
    return jsonResponse({ error: { code: 'STALE_EVENT' } }, { status: 401 });
  }

  const paths = pathsForEvent(event);
  const results = await Promise.allSettled(paths.map(async (path) => revalidatePath(path)));
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' ? [paths[index]!] : [],
  );
  const response = {
    revalidated: failed.length === 0,
    partial: failed.length > 0 && failed.length < paths.length,
    releaseId: event.releaseId,
    paths,
    ...(failed.length > 0 ? { failed } : {}),
  };
  return jsonResponse(response, {
    status: failed.length === paths.length ? 500 : 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
