import { Redis } from 'ioredis';
import { readEnv } from '@/shared/config/env-provider';

type Bucket = {
  count: number;
  resetAt: number;
};

type LimiterDecision = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

const buckets = new Map<string, Bucket>();
const LOCAL_CLEANUP_INTERVAL_MS = 60_000;
let nextLocalCleanupAt = 0;

const REDIS_URL = readEnv('REDIS_URL');
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1500,
      maxRetriesPerRequest: 1,
      keyPrefix: readEnv('REDIS_KEY_PREFIX') ?? 'realm:production:',
    });
    redisClient.on('error', () => {});
  }
  return redisClient;
}

export function isRateLimitPersistent(): boolean {
  return Boolean(REDIS_URL);
}

function localEnforce(key: string, limit: number, windowMs: number): LimiterDecision {
  const now = Date.now();
  if (now >= nextLocalCleanupAt) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    nextLocalCleanupAt = now + LOCAL_CLEANUP_INTERVAL_MS;
  }
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: windowMs };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

const LIMIT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  local ttl = redis.call('PTTL', KEYS[1])
  if ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
  end
  return { count, ttl }
`;

async function redisEnforce(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimiterDecision> {
  const [count, ttl] = (await redis.eval(LIMIT_SCRIPT, 1, key, windowMs)) as [number, number];
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs: Math.max(0, ttl),
  };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimiterDecision> {
  const redis = getRedis();
  if (!redis) {
    return localEnforce(key, limit, windowMs);
  }
  try {
    return await redisEnforce(redis, key, limit, windowMs);
  } catch {
    console.error('[rate-limit] Valkey unavailable; using the local rate limit');
    return localEnforce(key, limit, windowMs);
  }
}
