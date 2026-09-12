import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

import { getSiteUrl } from '@/shared/config/site';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse, parseCookieHeader } from '@/shared/server/http';
import type { VisitorStatsCounts, VisitorStatsResponse } from '@/features/visitor-stats/contracts';

const VISITOR_COOKIE_NAME = 'arsvine_visitor';
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const VISITOR_RATE_LIMIT = 10;
const VISITOR_RATE_LIMIT_WINDOW_MS = 10 * 60_000;

const VISITOR_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_USER_AGENT_PATTERN =
  /(?:bot|crawler|spider|slurp|headless|phantom|selenium|playwright|puppeteer|curl|wget|python[-_ ]?(?:requests?|urllib)|scrapy|go-http-client|libwww|httpclient|bytespider|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|baiduspider|yandexbot|bingpreview)/i;

type VisitorStatsSql = NeonQueryFunction<false, false>;

let sqlClient: VisitorStatsSql | null = null;
let sqlConnectionString = '';

function getVisitorStatsSecret(): string | null {
  const secret = process.env.VISITOR_STATS_SECRET?.trim();
  return secret || null;
}

function getDatabaseUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl || null;
}

function getSqlClient(): VisitorStatsSql | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!sqlClient || sqlConnectionString !== databaseUrl) {
    sqlClient = neon(databaseUrl);
    sqlConnectionString = databaseUrl;
  }

  return sqlClient;
}

function hmacHex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function hmacBase64Url(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function secureStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createVisitorCookieValue(visitorId: string, secret: string): string {
  return `${visitorId}.${hmacBase64Url(secret, `cookie:${visitorId}`)}`;
}

export function parseVisitorCookie(value: string | undefined, secret: string): string | null {
  if (!value) return null;

  const separatorIndex = value.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;

  const visitorId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  if (!VISITOR_ID_PATTERN.test(visitorId)) return null;

  const expectedSignature = hmacBase64Url(secret, `cookie:${visitorId}`);
  return secureStringEqual(signature, expectedSignature) ? visitorId : null;
}

export function deriveVisitorKey(visitorId: string, secret: string): string {
  return hmacHex(secret, `visitor:${visitorId}`);
}

export function isLikelyBotUserAgent(userAgent: string | null): boolean {
  const normalized = userAgent?.trim();
  return !normalized || BOT_USER_AGENT_PATTERN.test(normalized);
}

export function isLikelyBotRequest(request: Request): boolean {
  if (isLikelyBotUserAgent(request.headers.get('user-agent'))) return true;

  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  return fetchSite === 'cross-site' || fetchSite === 'cross-origin';
}

function getHostname(value: string | null): string | null {
  if (!value) return null;

  try {
    const normalized = value.includes('://') ? value : `https://${value}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getCanonicalOrigin(): string | null {
  try {
    return new URL(getSiteUrl()).origin;
  } catch {
    return null;
  }
}

function isProductionCanonicalRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  if (!getDatabaseUrl() || !getVisitorStatsSecret()) return false;

  const expectedHostname = getHostname(getSiteUrl());
  const requestHostname = getHostname(request.headers.get('host'));
  return Boolean(expectedHostname && requestHostname && expectedHostname === requestHostname);
}

function isSameOriginRequest(request: Request): boolean {
  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) return false;

  const origin = request.headers.get('origin')?.trim();
  if (origin) {
    try {
      if (new URL(origin).origin !== canonicalOrigin) return false;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer')?.trim();
  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== canonicalOrigin) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function getVisitorRateLimitKey(request: Request, secret: string): string | null {
  const ja4 = request.headers.get('x-vercel-ja4-digest')?.trim() ?? '';
  const clientAddress = getClientAddress(request);
  if (!ja4 && clientAddress === 'unknown') return null;

  const userAgent = request.headers.get('user-agent')?.trim().slice(0, 256) ?? '';
  const signal = [ja4 || 'missing-ja4', clientAddress, userAgent].join('|');
  return `visitor-stats:${hmacHex(secret, `rate:${signal}`)}`;
}

function parseCounter(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`invalid visitor stats counter: ${field}`);
  }
  return parsed;
}

export async function recordVisitor(
  sql: VisitorStatsSql,
  visitorKey: string,
): Promise<VisitorStatsCounts> {
  const rows = await sql`
    WITH current_day AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date AS visit_date
    ),
    new_identity AS (
      INSERT INTO arsvine_visitor_identities (visitor_key, first_seen_at)
      VALUES (${visitorKey}, CURRENT_TIMESTAMP)
      ON CONFLICT (visitor_key) DO NOTHING
      RETURNING visitor_key
    ),
    new_daily_visit AS (
      INSERT INTO arsvine_visitor_daily_visits (visit_date, visitor_key)
      SELECT current_day.visit_date, ${visitorKey}
      FROM current_day
      ON CONFLICT (visit_date, visitor_key) DO NOTHING
      RETURNING visit_date
    ),
    total_update AS (
      UPDATE arsvine_visitor_totals
      SET total_visitors = total_visitors + (SELECT COUNT(*) FROM new_identity),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = TRUE
      RETURNING total_visitors
    ),
    daily_update AS (
      INSERT INTO arsvine_visitor_daily_counts (visit_date, unique_visitors, updated_at)
      SELECT current_day.visit_date, COUNT(*)::bigint, CURRENT_TIMESTAMP
      FROM current_day
      INNER JOIN new_daily_visit ON TRUE
      GROUP BY current_day.visit_date
      ON CONFLICT (visit_date) DO UPDATE
        SET unique_visitors = arsvine_visitor_daily_counts.unique_visitors + EXCLUDED.unique_visitors,
            updated_at = CURRENT_TIMESTAMP
      RETURNING visit_date, unique_visitors
    )
    SELECT
      total_update.total_visitors,
      COALESCE(
        daily_update.unique_visitors,
        (
          SELECT unique_visitors
          FROM arsvine_visitor_daily_counts
          WHERE visit_date = current_day.visit_date
        ),
        0
      ) AS today_visitors
    FROM total_update
    CROSS JOIN current_day
    LEFT JOIN daily_update ON daily_update.visit_date = current_day.visit_date
  `;

  const row = rows[0] as { total_visitors?: unknown; today_visitors?: unknown } | undefined;
  if (!row) throw new Error('visitor stats query returned no counters');

  return {
    totalVisitors: parseCounter(row.total_visitors, 'total_visitors'),
    todayVisitors: parseCounter(row.today_visitors, 'today_visitors'),
  };
}

type VisitorStatsPersistence = (visitorKey: string) => Promise<VisitorStatsCounts>;

async function persistVisitor(visitorKey: string): Promise<VisitorStatsCounts> {
  const sql = getSqlClient();
  if (!sql) throw new Error('visitor stats database is not configured');
  return recordVisitor(sql, visitorKey);
}

function buildVisitorCookie(value: string): string {
  return [
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Max-Age=${VISITOR_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
  ].join('; ');
}

function disabledResponse(init: ResponseInit = {}): Response {
  return jsonResponse(
    {
      enabled: false,
      tracked: false,
      totalVisitors: null,
      todayVisitors: null,
    } satisfies VisitorStatsResponse,
    {
      ...init,
      headers: {
        'Cache-Control': 'private, no-store',
        ...init.headers,
      },
    },
  );
}

export function createVisitorStatsHandler(
  persist: VisitorStatsPersistence = persistVisitor,
): (request: Request) => Promise<Response> {
  return async function visitorStatsHandler(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return disabledResponse({ status: 405, headers: { Allow: 'POST' } });
    }

    if (!isProductionCanonicalRequest(request)) return disabledResponse();
    if (!isSameOriginRequest(request) || isLikelyBotRequest(request)) return disabledResponse();

    const secret = getVisitorStatsSecret();
    if (!secret) return disabledResponse();

    const rateLimitKey = getVisitorRateLimitKey(request, secret);
    if (rateLimitKey) {
      const limiter = await enforceRateLimit(
        rateLimitKey,
        VISITOR_RATE_LIMIT,
        VISITOR_RATE_LIMIT_WINDOW_MS,
      );
      if (!limiter.ok) {
        return disabledResponse({
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)) },
        });
      }
    }

    const cookies = parseCookieHeader(request.headers.get('cookie'));
    const existingVisitorId = parseVisitorCookie(cookies[VISITOR_COOKIE_NAME], secret);
    const visitorId = existingVisitorId ?? randomUUID();
    const visitorKey = deriveVisitorKey(visitorId, secret);

    let counts: VisitorStatsCounts;
    try {
      counts = await persist(visitorKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error('[visitor-stats] persistence failed:', message);
      return jsonResponse(
        { error: 'visitor_stats_unavailable' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const response = jsonResponse(
      {
        enabled: true,
        tracked: true,
        totalVisitors: counts.totalVisitors,
        todayVisitors: counts.todayVisitors,
      } satisfies VisitorStatsResponse,
      { headers: { 'Cache-Control': 'private, no-store' } },
    );

    if (!existingVisitorId) {
      response.headers.append(
        'Set-Cookie',
        buildVisitorCookie(createVisitorCookieValue(visitorId, secret)),
      );
    }

    return response;
  };
}

export default createVisitorStatsHandler();
