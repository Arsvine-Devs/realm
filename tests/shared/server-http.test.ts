import { afterEach, describe, expect, it } from 'vitest';

import { getClientAddress, parseCookieHeader } from '@/shared/server/http';

const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;

afterEach(() => {
  if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
});

describe('server HTTP helpers', () => {
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

  it('requires an explicit trusted proxy configuration', () => {
    delete process.env.TRUST_PROXY;
    const request = new Request('https://arsvine.com/api/test', {
      headers: { 'X-Real-IP': '203.0.113.11' },
    });
    expect(getClientAddress(request)).toBe('unknown');
  });

  it('parses valid cookies and drops malformed encoded values', () => {
    expect(parseCookieHeader('one=hello%20world; two=value')).toEqual({
      one: 'hello world',
      two: 'value',
    });
    expect(parseCookieHeader('broken=%E0%A4%A; valid=yes')).toEqual({ valid: 'yes' });
  });
});
