import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createVisitorCookieValue,
  createVisitorStatsHandler,
  deriveVisitorKey,
  getVisitorRateLimitKey,
  isLikelyBotUserAgent,
  isLikelyBotRequest,
  parseVisitorCookie,
  recordVisitor,
} from '@/features/visitor-stats/server/visitorStats';

const SECRET = 'visitor-test-secret';
const VISITOR_ID = '550e8400-e29b-41d4-a716-446655440000';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('visitor stats identity and filtering', () => {
  it('signs and verifies visitor cookies and rejects tampering', () => {
    const cookie = createVisitorCookieValue(VISITOR_ID, SECRET);

    expect(parseVisitorCookie(cookie, SECRET)).toBe(VISITOR_ID);
    expect(parseVisitorCookie(`${cookie}tampered`, SECRET)).toBeNull();
    expect(parseVisitorCookie(createVisitorCookieValue(VISITOR_ID, 'other'), SECRET)).toBeNull();
    expect(parseVisitorCookie('not-a-cookie', SECRET)).toBeNull();
  });

  it('derives a stable opaque key without exposing the visitor id', () => {
    const key = deriveVisitorKey(VISITOR_ID, SECRET);

    expect(key).toHaveLength(64);
    expect(key).toBe(deriveVisitorKey(VISITOR_ID, SECRET));
    expect(key).not.toContain(VISITOR_ID);
    expect(key).not.toBe(deriveVisitorKey(VISITOR_ID, 'other'));
  });

  it('rejects obvious automation while accepting ordinary browser user agents', () => {
    expect(isLikelyBotUserAgent('Googlebot/2.1')).toBe(true);
    expect(isLikelyBotUserAgent('curl/8.0')).toBe(true);
    expect(
      isLikelyBotUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(isLikelyBotUserAgent(null)).toBe(true);

    expect(
      isLikelyBotRequest(
        new Request('https://arsvine.com/api/visitor-stats', {
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-site': 'cross-site',
          },
        }),
      ),
    ).toBe(true);
  });

  it('uses a keyed rate-limit signal without putting raw fingerprint data in the key', () => {
    vi.stubEnv('VERCEL', '1');
    const request = new Request('https://arsvine.com/api/visitor-stats', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-vercel-ja4-digest': 'ja4-example',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const key = getVisitorRateLimitKey(request, SECRET);
    expect(key).toMatch(/^visitor-stats:[0-9a-f]{64}$/);
    expect(key).not.toContain('ja4-example');
    expect(key).not.toContain('203.0.113.10');
  });
});

describe('visitor stats persistence query', () => {
  it('uses atomic daily and all-time conflict-safe SQL and parses counters', async () => {
    const sqlMock = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      expect(values).toContain('opaque-visitor-key');
      return [{ total_visitors: '12', today_visitors: '4' }];
    });
    const sql = sqlMock as unknown as Parameters<typeof recordVisitor>[0];

    await expect(recordVisitor(sql, 'opaque-visitor-key')).resolves.toEqual({
      totalVisitors: 12,
      todayVisitors: 4,
    });

    const [strings] = sqlMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    const query = strings.raw.join('?');
    expect(query).toContain('ON CONFLICT (visitor_key) DO NOTHING');
    expect(query).toContain('ON CONFLICT (visit_date, visitor_key) DO NOTHING');
    expect(query).toContain("AT TIME ZONE 'Asia/Shanghai'");
  });
});

describe('visitor stats handler', () => {
  function productionRequest(extraHeaders: Record<string, string> = {}): Request {
    return new Request('https://arsvine.com/api/visitor-stats', {
      method: 'POST',
      headers: {
        host: 'arsvine.com',
        origin: 'https://arsvine.com',
        'user-agent': 'Mozilla/5.0',
        ...extraHeaders,
      },
    });
  }

  function enableProduction() {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/visitor-stats');
    vi.stubEnv('VISITOR_STATS_SECRET', SECRET);
  }

  it('records an eligible canonical request and sets a signed HttpOnly cookie', async () => {
    enableProduction();
    const persist = vi.fn(async () => ({ totalVisitors: 12, todayVisitors: 4 }));
    const handler = createVisitorStatsHandler(persist);

    const response = await handler(productionRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      enabled: true,
      tracked: true,
      totalVisitors: 12,
      todayVisitors: 4,
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toMatch(
      /^arsvine_visitor=[^;]+; Max-Age=31536000; Path=\/; HttpOnly; SameSite=Lax; Secure$/,
    );
    expect(persist).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it('reuses a valid cookie without issuing another cookie', async () => {
    enableProduction();
    const persist = vi.fn(async () => ({ totalVisitors: 12, todayVisitors: 4 }));
    const handler = createVisitorStatsHandler(persist);
    const cookie = createVisitorCookieValue(VISITOR_ID, SECRET);

    const response = await handler(productionRequest({ cookie: `arsvine_visitor=${cookie}` }));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(persist).toHaveBeenCalledWith(deriveVisitorKey(VISITOR_ID, SECRET));
  });

  it('ignores bots, preview hosts, and persistence failures without writing cookies', async () => {
    enableProduction();
    const persist = vi.fn(async () => ({ totalVisitors: 12, todayVisitors: 4 }));
    const handler = createVisitorStatsHandler(persist);

    const botResponse = await handler(productionRequest({ 'user-agent': 'Googlebot/2.1' }));
    expect(botResponse.status).toBe(200);
    expect(persist).not.toHaveBeenCalled();
    expect(botResponse.headers.get('set-cookie')).toBeNull();

    const previewResponse = await handler(
      new Request('https://preview.vercel.app/api/visitor-stats', {
        method: 'POST',
        headers: { host: 'preview.vercel.app', 'user-agent': 'Mozilla/5.0' },
      }),
    );
    expect(previewResponse.status).toBe(200);
    expect(persist).not.toHaveBeenCalled();

    const failedHandler = createVisitorStatsHandler(
      vi.fn(async () => {
        throw new Error('database offline');
      }),
    );
    const failedResponse = await failedHandler(productionRequest());
    expect(failedResponse.status).toBe(503);
    expect(failedResponse.headers.get('set-cookie')).toBeNull();
  });
});
