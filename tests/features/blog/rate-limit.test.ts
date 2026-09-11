import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

// 在 import rate-limit 之前先把 UPSTASH 变量清掉；
// 各 describe 会自己 setUpstashEnv() / clearUpstashEnv() 来控制路径分支。
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const redisState: {
  store: Map<string, { value: number; pttl: number }>;
} = {
  store: new Map(),
};

const fakeRedis = {
  incr: vi.fn(function incr(key: string) {
    const existing = redisState.store.get(key);
    if (existing) {
      existing.value += 1;
      return existing.value;
    }
    redisState.store.set(key, { value: 1, pttl: 60_000 });
    return 1;
  }),
  expire: vi.fn(function expire(key: string, seconds: number) {
    const existing = redisState.store.get(key);
    if (existing) {
      existing.pttl = seconds * 1000;
      return 1;
    }
    return 0;
  }),
  pttl: vi.fn(function pttl(key: string) {
    return redisState.store.get(key)?.pttl ?? -1;
  }),
};

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function RedisMock() {
    return fakeRedis;
  }),
}));

function setUpstashEnv() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
}

function clearUpstashEnv() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

beforeEach(() => {
  redisState.store.clear();
  clearUpstashEnv();
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe('enforceRateLimit — local Map path (Upstash 未配置)', () => {
  it('allows up to limit then blocks subsequent requests', async () => {
    const { enforceRateLimit, isRateLimitPersistent } =
      await import('@/shared/lib/content/rate-limit');
    expect(isRateLimitPersistent()).toBe(false);

    const key = `totp:1.2.3.4:test-a-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      const result = await enforceRateLimit(key, 5, 60_000);
      expect(result.ok).toBe(true);
    }
    const blocked = await enforceRateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('reports isRateLimitPersistent correctly', async () => {
    const { isRateLimitPersistent } = await import('@/shared/lib/content/rate-limit');
    expect(isRateLimitPersistent()).toBe(false);
  });

  it('resets the window after windowMs', async () => {
    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const key = `totp:reset:${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(key, 5, 50);
    }
    const blocked = await enforceRateLimit(key, 5, 50);
    expect(blocked.ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const afterReset = await enforceRateLimit(key, 5, 50);
    expect(afterReset.ok).toBe(true);
  });

  it('uses independent buckets per key', async () => {
    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const a = `totp:1.1.1.1:a-${Math.random()}`;
    const b = `totp:1.1.1.1:b-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(a, 5, 60_000);
    }
    expect((await enforceRateLimit(a, 5, 60_000)).ok).toBe(false);
    expect((await enforceRateLimit(b, 5, 60_000)).ok).toBe(true);
  });

  it('prunes expired local buckets during the periodic cleanup pass', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const deleteSpy = vi.spyOn(Map.prototype, 'delete');
    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const expiredKey = `totp:expired:${Math.random()}`;

    await enforceRateLimit(expiredKey, 5, 1_000);
    vi.setSystemTime(new Date('2030-01-01T00:01:01Z'));
    await enforceRateLimit(`totp:active:${Math.random()}`, 5, 60_000);

    expect(deleteSpy).toHaveBeenCalledWith(expiredKey);
  });
});

describe('enforceRateLimit — Upstash path (Upstash 已配置)', () => {
  it('allows up to limit then blocks', async () => {
    setUpstashEnv();
    const { enforceRateLimit, isRateLimitPersistent } =
      await import('@/shared/lib/content/rate-limit');
    expect(isRateLimitPersistent()).toBe(true);

    const key = `totp:1.2.3.4:upstash-a-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      const result = await enforceRateLimit(key, 5, 60_000);
      expect(result.ok).toBe(true);
    }
    const blocked = await enforceRateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
  });

  it('sets TTL only on the first INCR', async () => {
    setUpstashEnv();
    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const key = `totp:ttl:${Math.random()}`;
    await enforceRateLimit(key, 5, 60_000);
    expect(redisState.store.get(key)?.pttl).toBe(60_000);
    const initialPttl = redisState.store.get(key)?.pttl;
    await enforceRateLimit(key, 5, 60_000);
    expect(redisState.store.get(key)?.pttl).toBe(initialPttl);
  });
});

describe('enforceRateLimit — fail-open on Redis error', () => {
  it('falls back to local Map when Redis throws', async () => {
    setUpstashEnv();
    // 替换 mock 让它报错
    const errRedis = {
      incr: vi.fn(function incr() {
        return Promise.reject(new Error('redis unreachable'));
      }),
      expire: vi.fn(),
      pttl: vi.fn(),
    };
    vi.doMock('@upstash/redis', () => ({
      Redis: vi.fn(function RedisErrorMock() {
        return errRedis;
      }),
    }));

    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const key = `totp:failopen:${Math.random()}`;
    const result = await enforceRateLimit(key, 5, 60_000);
    // fail-open：依旧能通过限流（而非 500 / 拒所有）
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});
