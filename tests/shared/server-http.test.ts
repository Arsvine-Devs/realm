import { afterEach, describe, expect, it } from 'vitest';

import { getClientAddress, parseCookieHeader, secureStringEqual } from '@/shared/server/http';

const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;
const ORIGINAL_VERCEL = process.env.VERCEL;

afterEach(() => {
  if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

describe('server HTTP helpers', () => {
  it('compares equal strings without accepting length or content mismatches', () => {
    expect(secureStringEqual('same-token', 'same-token')).toBe(true);
    expect(secureStringEqual('same-token', 'other-token')).toBe(false);
    expect(secureStringEqual('short', 'longer')).toBe(false);
  });

  it('ignores forwarded client headers unless the proxy is trusted', () => {
    process.env.TRUST_PROXY = '0';
    const request = new Request('https://arsvine.com/api/test', {
      headers: { 'X-Forwarded-For': '203.0.113.10, 10.0.0.1', 'X-Real-IP': '203.0.113.11' },
    });
    expect(getClientAddress(request)).toBe('unknown');
  });

  it('uses the first forwarded address behind an explicitly trusted proxy', () => {
    process.env.TRUST_PROXY = '1';
    const request = new Request('https://arsvine.com/api/test', {
      headers: { 'X-Forwarded-For': '203.0.113.10, 10.0.0.1', 'X-Real-IP': '203.0.113.11' },
    });
    expect(getClientAddress(request)).toBe('203.0.113.10');
  });

  it('trusts Vercel-managed forwarding headers by default', () => {
    delete process.env.TRUST_PROXY;
    process.env.VERCEL = '1';
    const request = new Request('https://arsvine.com/api/test', {
      headers: { 'X-Real-IP': '203.0.113.11' },
    });
    expect(getClientAddress(request)).toBe('203.0.113.11');
  });

  it('parses valid cookies and drops malformed encoded values', () => {
    expect(parseCookieHeader('one=hello%20world; two=value')).toEqual({
      one: 'hello world',
      two: 'value',
    });
    expect(parseCookieHeader('broken=%E0%A4%A; valid=yes')).toEqual({ valid: 'yes' });
  });
});
