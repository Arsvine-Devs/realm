import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const redisState = new Map<string, { value: number; ttl: number }>();
const fakeRedis = {
  on: vi.fn(),
  eval: vi.fn(async (_script: string, _keyCount: number, key: string, windowMs: number) => {
    const bucket = redisState.get(key) ?? { value: 0, ttl: windowMs };
    bucket.value += 1;
    redisState.set(key, bucket);
    return [bucket.value, bucket.ttl];
  }),
};

vi.mock('ioredis', () => ({
  Redis: vi.fn(function RedisMock() {
    return fakeRedis;
  }),
}));

function setValkeyEnv() {
  process.env.REDIS_URL = 'redis://127.0.0.1:1';
}

beforeEach(() => {
  redisState.clear();
  delete process.env.REDIS_URL;
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe('enforceRateLimit — local Map path (Valkey 未配置)', () => {
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

describe('enforceRateLimit — Valkey path (Valkey 已配置)', () => {
  it('allows up to limit then blocks', async () => {
    setValkeyEnv();
    const { enforceRateLimit, isRateLimitPersistent } =
      await import('@/shared/lib/content/rate-limit');
    expect(isRateLimitPersistent()).toBe(true);

    const key = `totp:1.2.3.4:valkey-a-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      const result = await enforceRateLimit(key, 5, 60_000);
      expect(result.ok).toBe(true);
    }
    const blocked = await enforceRateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
  });

  it('sets TTL only on the first INCR', async () => {
    setValkeyEnv();
    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const key = `totp:ttl:${Math.random()}`;
    await enforceRateLimit(key, 5, 60_000);
    expect(redisState.get(key)?.ttl).toBe(60_000);
    const initialPttl = redisState.get(key)?.ttl;
    await enforceRateLimit(key, 5, 60_000);
    expect(redisState.get(key)?.ttl).toBe(initialPttl);
  });
});

describe('enforceRateLimit — fail-open on Redis error', () => {
  it('falls back to local Map when Redis throws', async () => {
    setValkeyEnv();
    fakeRedis.eval.mockRejectedValueOnce(new Error('Valkey unavailable'));

    const { enforceRateLimit } = await import('@/shared/lib/content/rate-limit');
    const key = `totp:failopen:${Math.random()}`;
    const result = await enforceRateLimit(key, 5, 60_000);
    // fail-open：依旧能通过限流（而非 500 / 拒所有）
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});
