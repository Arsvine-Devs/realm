import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';

describe('proxy bare-path redirect', () => {
  it('returns a cache-safe locale redirect response', () => {
    const response = proxy(
      new NextRequest('https://arsvine.com/about', {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      }),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe('https://arsvine.com/en/about');
    expect(response.headers.get('Vary')).toBe('Cookie, Accept-Language');
  });
});
