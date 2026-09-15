import { Redis } from '@upstash/redis';
import { readEnv } from '@/shared/config/env-provider';

/**
 * 滑动 / 固定窗口内对 (key, limit, windowMs) 进行计数，达到 limit 后阻断后续请求。
 *
 * 持久化：优先用 Upstash Redis（Vercel Marketplace 推荐替代品；原 @vercel/kv 已 deprecated）。
 * 配置方式：在 Vercel 项目集成 Upstash Redis 后会自动注入 UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN 两个环境变量；本地 .env.local 也可手动配。
 *
 * 当 Upstash 未配置时（开发 / 自托管 / 未集成），降级为 process-local Map —— 单实例
 * 准确，但 serverless 多实例不可靠。这是有意保留的开发期 fallback；生产部署必须接 Redis。
 */

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

const REDIS_URL = readEnv('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = readEnv('UPSTASH_REDIS_REST_TOKEN');

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  if (!redisClient) {
    redisClient = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
  return redisClient;
}

export function isRateLimitPersistent(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
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

async function redisEnforce(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimiterDecision> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  // INCR + 首次 EXPIRE 是经典的固定窗口实现：第一次累加后设置 TTL，自动过期重置窗口。
  // 攻击者并发请求时多实例都打到同一 Redis 键，串行化在 Redis 端完成，准确性远好于 in-process Map。
  const count = await redis.incr(key);
  let ttlSec = -1;
  if (count === 1) {
    await redis.expire(key, windowSeconds);
    ttlSec = windowSeconds;
  } else {
    // PTTL 返回毫秒；若键无 TTL（极端边界 —— 进程在 incr 与 expire 之间被杀），重新设置兜底。
    const pttl = await redis.pttl(key);
    if (pttl < 0) {
      await redis.expire(key, windowSeconds);
      ttlSec = windowSeconds;
    } else {
      ttlSec = pttl / 1000;
    }
  }
  const retryAfterMs = Math.max(0, Math.round(ttlSec * 1000));

  if (count > limit) {
    return { ok: false, remaining: 0, retryAfterMs };
  }
  return {
    ok: true,
    remaining: Math.max(0, limit - count),
    retryAfterMs,
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
  } catch (error) {
    // Redis 不可达时 fail-open 到本地 Map：拒绝所有请求会让真用户也无法验证 TOTP；
    // 但日志要落盘，运维可追溯。
    console.error('[rate-limit] redis enforce failed; falling back to local map', error);
    return localEnforce(key, limit, windowMs);
  }
}
