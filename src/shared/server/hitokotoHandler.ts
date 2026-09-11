import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse } from './http';

/**
 * 一言代理 (https://developer.hitokoto.cn/sentence/)
 *
 * 为什么走代理而不是客户端直连：
 *  - 统一出口便于将来加监控 / 换源；
 *  - 隔离上游故障（一言曾因 DDoS 多次降级）。
 *
 * 缓存策略（两层）：
 *  - 主层：Vercel edge，s-maxage=300（5min 内同一节点所有访客共享一份响应），
 *    stale-while-revalidate=3600（缓存过期后边缘立即吐旧、后台异步刷新，
 *    上游故障时旧内容最多兜底 1 小时）。
 *  - 次层：进程内 60s 缓存，主要在 edge 未命中时减轻同一 lambda 实例的上游压力，
 *    冷启动时重置，无害冗余。
 *
 * 句源约束：c=d|i|k（文学/诗词/哲学），长度 10–30。
 *
 * 限流（纵深防御）：edge 缓存失效时，按 IP 限流 30 次/10 分钟，拦截绕过缓存
 * 的突发爬虫/脚本。真实活跃用户打到 origin 约 2 次/10 分钟，不会触发。
 *
 * 响应：
 *  - 200 { text: string }      —— 成功（含缓存）
 *  - 429 { error: 'rate_limited' } —— 超出 IP 限流（Retry-After 秒）
 *  - 502 { error: 'upstream_unavailable' } —— 上游失败 / 超时 / 空内容
 *
 * 客户端按 HTTP 状态判断即可，不需要解析 error 字段。
 */

const UPSTREAM =
  'https://v1.hitokoto.cn/?c=d&c=i&c=k&min_length=10&max_length=30&encode=json&charset=utf-8';
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 600_000; // 10 min

// 进程内缓存：开发热重载会重置；生产 Vercel serverless 冷启动也会重置 - 都可接受
let cache: { text: string; expiresAt: number } | null = null;

export default async function handler(request: Request) {
  const limiter = await enforceRateLimit(
    `hitokoto:${getClientAddress(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!limiter.ok) {
    return jsonResponse(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)),
        },
      },
    );
  }

  if (cache && cache.expiresAt > Date.now()) {
    return jsonResponse(
      { text: cache.text },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
      },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(UPSTREAM, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = await upstream.json();
    const text = typeof data?.hitokoto === 'string' ? data.hitokoto.trim() : '';
    if (!text) throw new Error('empty hitokoto');
    cache = { text, expiresAt: Date.now() + CACHE_TTL_MS };
    return jsonResponse(
      { text },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
      },
    );
  } catch (err) {
    clearTimeout(timeoutId);
    // 仅记录摘要，避免 Vercel 日志噪音
    console.warn('[hitokoto] upstream failed:', (err as Error).message);
    return jsonResponse({ error: 'upstream_unavailable' }, { status: 502 });
  }
}
