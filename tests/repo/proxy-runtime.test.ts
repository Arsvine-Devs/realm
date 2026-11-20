import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';

describe('proxy bare-path redirect', () => {
  it('passes the route locale to the layout instead of the caller-provided header', () => {
    const response = proxy(
      new NextRequest('https://arsvine.com/zh-TW/content', {
        headers: { 'x-arsvine-locale': 'en' },
      }),
    );

    expect(response.headers.get('x-middleware-request-x-arsvine-locale')).toBe('zh-TW');
    expect(response.headers.has('x-arsvine-locale')).toBe(false);
  });
  it('returns a cache-safe locale redirect response', () => {
    const response = proxy(
      new NextRequest('https://arsvine.com/about', {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('Location')).toBe('https://arsvine.com/en/about');
    expect(response.headers.get('Vary')).toBe('Cookie, Accept-Language');
  });
});
