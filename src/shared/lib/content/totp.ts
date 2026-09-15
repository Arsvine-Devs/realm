import { createHmac, timingSafeEqual } from 'node:crypto';
import { readEnv } from '@/shared/config/env-provider';
import type { TotpGroupConfig } from './types';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  let bits = '';

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 secret.');
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: bigint, digits: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    10 ** digits;

  return code.toString().padStart(digits, '0');
}

export function verifyTotp(opts: {
  token: string;
  secretBase32: string;
  period?: number;
  digits?: number;
  window?: number;
  nowMs?: number;
}) {
  const { token, secretBase32, period = 30, digits = 6, window = 1, nowMs = Date.now() } = opts;

  if (!/^\d+$/.test(token) || token.length !== digits) return false;

  const secret = base32Decode(secretBase32);
  const step = BigInt(Math.floor(nowMs / 1000 / period));

  // 用 timingSafeEqual 替代 === 字符串比较。6 位数字 + HTTPS 抖动让真实攻击
  // 极难实现，但与 access-grant 保持一致更重要：项目内安全代码不该混用
  // 短路/非短路比较。token 与 hotp 同长度（digits），无长度差，无需额外判断。
  const expected = Buffer.from(token);

  for (let offset = -window; offset <= window; offset += 1) {
    const generated = Buffer.from(hotp(secret, step + BigInt(offset), digits));
    if (generated.length === expected.length && timingSafeEqual(generated, expected)) {
      return true;
    }
  }

  return false;
}

export function getTotpGroups() {
  const raw = readEnv('TOTP_GROUPS_JSON');
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid TOTP_GROUPS_JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('TOTP_GROUPS_JSON must be an object map.');
  }

  return parsed as Record<string, TotpGroupConfig>;
}

export function getTotpGroup(group: string) {
  return getTotpGroups()[group];
}

export function verifyTotpGroupToken(group: string, token: string) {
  const config = getTotpGroup(group);
  if (!config) {
    return { ok: false as const, reason: 'group_not_found' };
  }

  if (
    verifyTotp({
      token,
      secretBase32: config.current,
      digits: config.digits,
      period: config.period,
      window: config.window,
    })
  ) {
    return { ok: true as const, config };
  }

  for (const previous of config.previous ?? []) {
    if (
      verifyTotp({
        token,
        secretBase32: previous,
        digits: config.digits,
        period: config.period,
        window: config.window,
      })
    ) {
      return { ok: true as const, config };
    }
  }

  return { ok: false as const, reason: 'invalid_token' };
}
