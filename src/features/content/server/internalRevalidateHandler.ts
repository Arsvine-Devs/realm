import { createHmac } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { readEnv } from '@/shared/config/env-provider';
import { locales } from '@/shared/contracts/locale';
import { PUBLIC_CONTENT_CACHE_TAG } from '@/shared/lib/content/content-api';
import { getAssetRevalidationPaths as getPortfolioPaths } from '@/features/portfolio/contracts/data';
import { getAssetRevalidationPaths as getLifePaths } from '@/features/life/contracts/data';
import { jsonResponse, secureStringEqual } from '@/shared/server/http';

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;
const TIMESTAMP_HEADER = 'x-arsvine-timestamp';
const SIGNATURE_HEADER = 'x-arsvine-signature';

type RevalidationEvent = {
  event: 'content.published' | 'assets.published';
  releaseId: string;
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
  if (Object.keys(value).length !== 3) return null;
  const event = value.event;
  if (event !== 'content.published' && event !== 'assets.published') return null;
  if (
    typeof value.releaseId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.releaseId)
  ) {
    return null;
  }
  if (typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp))) {
    return null;
  }
  return {
    event,
    releaseId: value.releaseId,
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

function assetPaths() {
  const paths = new Set<string>();
  for (const locale of locales) {
    paths.add(`/${locale}`);
    paths.add(`/${locale}/content`);
    paths.add(`/${locale}/friends`);
    for (const path of getPortfolioPaths(locale)) paths.add(path);
    for (const path of getLifePaths(locale)) paths.add(path);
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

  const isContent = event.event === 'content.published';
  const targets = isContent ? [PUBLIC_CONTENT_CACHE_TAG] : assetPaths();
  const invalidate = isContent
    ? (tag: string) => revalidateTag(tag, { expire: 0 })
    : revalidatePath;
  const results = await Promise.allSettled(targets.map(async (target) => invalidate(target)));
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' ? [targets[index]!] : [],
  );
  const response = {
    revalidated: failed.length === 0,
    partial: failed.length > 0 && failed.length < targets.length,
    releaseId: event.releaseId,
    ...(isContent ? { tags: targets } : { paths: targets }),
    ...(failed.length > 0 ? { failed } : {}),
  };
  return jsonResponse(response, {
    status: failed.length === targets.length ? 500 : 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
