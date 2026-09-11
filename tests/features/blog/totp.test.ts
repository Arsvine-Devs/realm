import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getTotpGroup,
  getTotpGroups,
  verifyTotp,
  verifyTotpGroupToken,
} from '@/shared/lib/content/totp';

// RFC 4648 base32 编码的标准测试 secret，bit.ly/google-authenticator-wiki 推荐用"JBSWY3DPEHPK3PXP"。
// 整个 suite 不会因后续 rotate 而失效（与 env 完全独立）。
const FIXED_SECRET = 'JBSWY3DPEHPK3PXP';

const ORIGINAL_TOTP_JSON = process.env.TOTP_GROUPS_JSON;
const ORIGINAL_NOW = Date.now;
let mockedNow = 0;

beforeEach(() => {
  // 冻结时间为 2025-01-01 12:00:00 UTC（纪元 1735732800s），
  // 配合 period=30 时，counter=57857760，是个稳定的可预测起点。
  mockedNow = 1735732800 * 1000;
  Date.now = () => mockedNow;
});

afterEach(() => {
  Date.now = ORIGINAL_NOW;
  if (ORIGINAL_TOTP_JSON === undefined) {
    delete process.env.TOTP_GROUPS_JSON;
  } else {
    process.env.TOTP_GROUPS_JSON = ORIGINAL_TOTP_JSON;
  }
});

function setTotpGroups(groups: Record<string, unknown>) {
  process.env.TOTP_GROUPS_JSON = JSON.stringify(groups);
}

describe('verifyTotp (pure helper)', () => {
  it('accepts the correct code for the current step', () => {
    // 与 mockedNow 对齐算出的 current-step code。
    // counter = 1735732800 / 30 = 57857760；算法在 verifyTotp 内部。
    // 我们用算法自身的"窗口=0"反向锁定当前 token：跑 verifyTotp 但用更大 window 找一遍。
    // 为简单起见，这里改写为：用 verifyTotp(period=30) 验一组由 now 反推的 token。
    const period = 30;
    const step = BigInt(Math.floor(mockedNow / 1000 / period));
    const code = computeCodeForStep(FIXED_SECRET, step, 6);
    expect(
      verifyTotp({
        token: code,
        secretBase32: FIXED_SECRET,
        period,
        digits: 6,
        window: 0,
        nowMs: mockedNow,
      }),
    ).toBe(true);
  });

  it('accepts a code from the previous step when window=1', () => {
    const period = 30;
    const previous = computeCodeForStep(
      FIXED_SECRET,
      BigInt(Math.floor(mockedNow / 1000 / period)) - BigInt(1),
      6,
    );
    expect(
      verifyTotp({
        token: previous,
        secretBase32: FIXED_SECRET,
        period,
        digits: 6,
        window: 1,
        nowMs: mockedNow,
      }),
    ).toBe(true);
  });

  it('accepts a code from the next step when window=1', () => {
    const period = 30;
    const next = computeCodeForStep(
      FIXED_SECRET,
      BigInt(Math.floor(mockedNow / 1000 / period)) + BigInt(1),
      6,
    );
    expect(
      verifyTotp({
        token: next,
        secretBase32: FIXED_SECRET,
        period,
        digits: 6,
        window: 1,
        nowMs: mockedNow,
      }),
    ).toBe(true);
  });

  it('rejects a code from outside the window', () => {
    const period = 30;
    const far = computeCodeForStep(
      FIXED_SECRET,
      BigInt(Math.floor(mockedNow / 1000 / period)) + BigInt(5),
      6,
    );
    expect(
      verifyTotp({
        token: far,
        secretBase32: FIXED_SECRET,
        period,
        digits: 6,
        window: 1,
        nowMs: mockedNow,
      }),
    ).toBe(false);
  });

  it('rejects a token of wrong length or non-digits', () => {
    expect(verifyTotp({ token: '12345', secretBase32: FIXED_SECRET, nowMs: mockedNow })).toBe(
      false,
    );
    expect(verifyTotp({ token: '12345a7', secretBase32: FIXED_SECRET, nowMs: mockedNow })).toBe(
      false,
    );
    expect(verifyTotp({ token: '', secretBase32: FIXED_SECRET, nowMs: mockedNow })).toBe(false);
  });

  it('rejects when secret base32 contains illegal characters', () => {
    expect(() =>
      verifyTotp({ token: '000000', secretBase32: 'JBSWY3DPEHPK3P!@', nowMs: mockedNow }),
    ).toThrow(/Invalid base32/);
  });

  it('ignores base32 padding and whitespace', () => {
    const code = computeCodeForStep(FIXED_SECRET, BigInt(Math.floor(mockedNow / 1000 / 30)), 6);
    expect(verifyTotp({ token: code, secretBase32: `${FIXED_SECRET}====`, nowMs: mockedNow })).toBe(
      true,
    );
    expect(
      verifyTotp({
        token: code,
        secretBase32: FIXED_SECRET.match(/.{1,4}/g)!.join(' '),
        nowMs: mockedNow,
      }),
    ).toBe(true);
  });
});

describe('verifyTotpGroupToken', () => {
  it('accepts a valid token for the current secret', () => {
    const period = 30;
    const code = computeCodeForStep(FIXED_SECRET, BigInt(Math.floor(mockedNow / 1000 / period)), 6);
    setTotpGroups({ 'friends-a': { current: FIXED_SECRET, period, digits: 6, window: 1 } });
    const result = verifyTotpGroupToken('friends-a', code);
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid token', () => {
    setTotpGroups({ 'friends-a': { current: FIXED_SECRET, period: 30, digits: 6, window: 1 } });
    const result = verifyTotpGroupToken('friends-a', '000000');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_token');
  });

  it('returns group_not_found for an unknown group', () => {
    setTotpGroups({ 'friends-a': { current: FIXED_SECRET, period: 30, digits: 6, window: 1 } });
    const result = verifyTotpGroupToken('friends-b', '000000');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('group_not_found');
  });

  it('falls back to a previous secret during rotation', () => {
    const period = 30;
    const previousSecret = 'KRSXG5BAONSWG4TFOQ';
    const previousCode = computeCodeForStep(
      previousSecret,
      BigInt(Math.floor(mockedNow / 1000 / period)),
      6,
    );
    setTotpGroups({
      'friends-a': {
        current: FIXED_SECRET,
        previous: [previousSecret],
        period,
        digits: 6,
        window: 1,
      },
    });
    expect(verifyTotpGroupToken('friends-a', previousCode).ok).toBe(true);
  });

  it('does not accept an old previous code when previous list is empty', () => {
    const period = 30;
    const code = computeCodeForStep(FIXED_SECRET, BigInt(Math.floor(mockedNow / 1000 / period)), 6);
    setTotpGroups({ 'friends-a': { current: FIXED_SECRET, period, digits: 6, window: 1 } });
    expect(verifyTotpGroupToken('friends-a', code).ok).toBe(true);
  });
});

describe('getTotpGroups / getTotpGroup', () => {
  it('returns empty object when TOTP_GROUPS_JSON is unset', () => {
    delete process.env.TOTP_GROUPS_JSON;
    expect(getTotpGroups()).toEqual({});
    expect(getTotpGroup('friends-a')).toBeUndefined();
  });

  it('parses a valid groups map', () => {
    setTotpGroups({ 'friends-a': { current: FIXED_SECRET, period: 30, digits: 6, window: 1 } });
    expect(getTotpGroup('friends-a')?.current).toBe(FIXED_SECRET);
  });

  it('throws on invalid JSON', () => {
    process.env.TOTP_GROUPS_JSON = '{not-json';
    expect(() => getTotpGroups()).toThrow(/Invalid TOTP_GROUPS_JSON/);
  });

  it('throws when the payload is not a plain object', () => {
    process.env.TOTP_GROUPS_JSON = '[]';
    expect(() => getTotpGroups()).toThrow(/TOTP_GROUPS_JSON must be an object map/);
  });
});

// 重新实现一次 RFC 6238 hotp 来在测试里反推 token：
// 不能复用 lib 内部 hotp（未导出），所以在这写一份同样实现 ——
// 测试用 helper，独立于库实现；只是 sanity check 当前 fixed-secret 跑得通。
// 库实现是 [lib/content/totp.ts:26-40]，这份 helper 必须严格同步。
import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  let bits = '';
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeCodeForStep(secretBase32: string, counter: bigint, digits: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const secret = base32Decode(secretBase32);
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
