import { describe, expect, it } from 'vitest';

import { normalizeNextPath } from '@/shared/lib/content/access-api';

describe('normalizeNextPath', () => {
  it('keeps safe internal paths', () => {
    expect(normalizeNextPath('/en/blog/init')).toBe('/en/blog/init');
    expect(normalizeNextPath('/zh-TW/content?view=works#blog')).toBe(
      '/zh-TW/content?view=works#blog',
    );
  });

  it('rejects empty, external or protocol-relative paths', () => {
    expect(normalizeNextPath(undefined)).toBe('/');
    expect(normalizeNextPath('https://example.com')).toBe('/');
    expect(normalizeNextPath('//example.com')).toBe('/');
    expect(normalizeNextPath('/\\example.com')).toBe('/');
    expect(normalizeNextPath('/en/..//example.com')).toBe('/');
  });
});
