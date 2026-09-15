import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getTotpGroup,
  getTotpGroups,
  verifyTotp,
  verifyTotpGroupToken,
} from '@/shared/lib/content/totp';

// RFC 6238 Appendix B, SHA-1 test secret encoded as base32.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const OTHER_SECRET = 'JBSWY3DPEHPK3PXP';
const ORIGINAL_TOTP_JSON = process.env.TOTP_GROUPS_JSON;
const ORIGINAL_NOW = Date.now;
let mockedNow = 59_000;

beforeEach(() => {
  mockedNow = 59_000;
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

describe('verifyTotp', () => {
  it('accepts the RFC 6238 current-step vector', () => {
    expect(
      verifyTotp({
        token: '94287082',
        secretBase32: RFC_SECRET,
        period: 30,
        digits: 8,
        window: 0,
        nowMs: 59_000,
      }),
    ).toBe(true);
  });

  it('accepts adjacent RFC 6238 vectors only inside the configured window', () => {
    expect(
      verifyTotp({
        token: '14050471',
        secretBase32: RFC_SECRET,
        period: 30,
        digits: 8,
        window: 1,
        nowMs: 1_111_111_109_000,
      }),
    ).toBe(true);
    expect(
      verifyTotp({
        token: '07081804',
        secretBase32: RFC_SECRET,
        period: 30,
        digits: 8,
        window: 1,
        nowMs: 1_111_111_111_000,
      }),
    ).toBe(true);
    expect(
      verifyTotp({
        token: '94287082',
        secretBase32: RFC_SECRET,
        period: 30,
        digits: 8,
        window: 1,
        nowMs: 1_111_111_111_000,
      }),
    ).toBe(false);
  });

  it('rejects malformed tokens and illegal secrets', () => {
    expect(verifyTotp({ token: '1234567', secretBase32: RFC_SECRET, nowMs: mockedNow })).toBe(
      false,
    );
    expect(verifyTotp({ token: '12345a7', secretBase32: RFC_SECRET, nowMs: mockedNow })).toBe(
      false,
    );
    expect(() =>
      verifyTotp({ token: '123456', secretBase32: 'JBSWY3DPEHPK3P!', nowMs: mockedNow }),
    ).toThrow(/Invalid base32/);
  });

  it('accepts base32 padding and whitespace', () => {
    expect(
      verifyTotp({
        token: '94287082',
        secretBase32: `${RFC_SECRET}====`,
        digits: 8,
        nowMs: 59_000,
      }),
    ).toBe(true);
    expect(
      verifyTotp({
        token: '94287082',
        secretBase32: RFC_SECRET.match(/.{1,4}/g)!.join(' '),
        digits: 8,
        nowMs: 59_000,
      }),
    ).toBe(true);
  });
});

describe('verifyTotpGroupToken', () => {
  it('accepts a valid current secret', () => {
    setTotpGroups({ 'friends-a': { current: RFC_SECRET, period: 30, digits: 8, window: 1 } });

    expect(verifyTotpGroupToken('friends-a', '94287082').ok).toBe(true);
  });

  it('rejects an invalid token and reports an unknown group', () => {
    setTotpGroups({ 'friends-a': { current: RFC_SECRET, period: 30, digits: 8, window: 1 } });

    const invalid = verifyTotpGroupToken('friends-a', '00000000');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.reason).toBe('invalid_token');
    expect(verifyTotpGroupToken('friends-b', '00000000')).toEqual({
      ok: false,
      reason: 'group_not_found',
    });
  });

  it('accepts a code from a previous secret during rotation', () => {
    setTotpGroups({
      'friends-a': {
        current: OTHER_SECRET,
        previous: [RFC_SECRET],
        period: 30,
        digits: 8,
        window: 1,
      },
    });

    expect(verifyTotpGroupToken('friends-a', '94287082').ok).toBe(true);
  });
});

describe('getTotpGroups / getTotpGroup', () => {
  it('returns an empty map when TOTP_GROUPS_JSON is unset', () => {
    delete process.env.TOTP_GROUPS_JSON;

    expect(getTotpGroups()).toEqual({});
    expect(getTotpGroup('friends-a')).toBeUndefined();
  });

  it('parses a valid groups map', () => {
    setTotpGroups({ 'friends-a': { current: RFC_SECRET, period: 30, digits: 8, window: 1 } });

    expect(getTotpGroup('friends-a')?.current).toBe(RFC_SECRET);
  });

  it('rejects malformed or non-map configuration', () => {
    process.env.TOTP_GROUPS_JSON = '{not-json';
    expect(() => getTotpGroups()).toThrow(/Invalid TOTP_GROUPS_JSON/);

    process.env.TOTP_GROUPS_JSON = '[]';
    expect(() => getTotpGroups()).toThrow(/TOTP_GROUPS_JSON must be an object map/);
  });
});
