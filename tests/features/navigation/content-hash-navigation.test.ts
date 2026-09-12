import { describe, expect, it } from 'vitest';

import {
  classifyRoutePathname,
  createContentHashNavigationRequest,
  getContentSectionHashFromUrl,
  isBlogDetailUrl,
  isHomeUrl,
  resolveContentHashTransitionMode,
  resolveNavigationTransitionPlan,
} from '@/features/navigation/model/contentHashNavigation';

describe('getContentSectionHashFromUrl', () => {
  it('extracts section hash from content URLs', () => {
    expect(getContentSectionHashFromUrl('/en/content#life')).toBe('life');
    expect(getContentSectionHashFromUrl('/zh-CN/content?foo=bar#about')).toBe('about');
  });

  it('ignores non-content or hashless URLs', () => {
    expect(getContentSectionHashFromUrl('/en/friends')).toBeNull();
    expect(getContentSectionHashFromUrl('/en/content')).toBeNull();
    expect(getContentSectionHashFromUrl('/en/blog/init')).toBeNull();
  });
});

describe('classifyRoutePathname', () => {
  it('classifies App Router pathname values', () => {
    expect(classifyRoutePathname('/zh-CN')).toBe('home');
    expect(classifyRoutePathname('/zh-CN/content')).toBe('content');
    expect(classifyRoutePathname('/zh-CN/blog/init')).toBe('standalone');
    expect(classifyRoutePathname('/zh-CN/friends')).toBe('auxiliary');
  });
});

describe('resolveContentHashTransitionMode', () => {
  it('treats home to content hash as cross-page', () => {
    expect(resolveContentHashTransitionMode('/zh-CN', '/en/content#life')).toBe('cross-page');
  });

  it('treats auxiliary pages to content hash as cross-page', () => {
    expect(resolveContentHashTransitionMode('/zh-CN/friends', '/en/content#about')).toBe(
      'cross-page',
    );
    expect(resolveContentHashTransitionMode('/zh-CN/friends', '/en/content#blog')).toBe(
      'cross-page',
    );
  });

  it('treats content to content hash as same-page', () => {
    expect(resolveContentHashTransitionMode('/zh-CN/content', '/en/content#life')).toBe(
      'same-page',
    );
  });

  it('ignores non-content-hash targets', () => {
    expect(resolveContentHashTransitionMode('/zh-CN/friends', '/en/blog/init')).toBe(
      'not-content-hash',
    );
  });
});

describe('createContentHashNavigationRequest', () => {
  it('creates a stable request payload with hash and request id', () => {
    const request = createContentHashNavigationRequest('life');
    expect(request.hash).toBe('life');
    expect(request.requestId).toMatch(/^content-hash-\d+$/);
  });
});

describe('resolveNavigationTransitionPlan', () => {
  it.each([
    ['/zh-CN/content', '/en/content#life', false, 'samePageHash'],
    ['/zh-CN', '/en/content#life', false, 'homeForwardDesktop'],
    ['/zh-CN', '/en/content#life', true, 'homeForwardMobile'],
    ['/zh-CN/friends', '/en/content#life', false, 'crossPageHash'],
    ['/zh-CN/friends', '/en', false, 'returnHomeDesktop'],
    ['/zh-CN/friends', '/en', true, 'returnHomeMobile'],
    ['/zh-CN/friends', '/en/blog/init', false, 'blogDetailFade'],
  ] as const)('maps %s -> %s to %s', (sourcePathname, targetUrl, mobile, expected) => {
    expect(resolveNavigationTransitionPlan({ sourcePathname, targetUrl, mobile })).toBe(expected);
  });

  it('classifies target URLs without relying on regex fragments', () => {
    expect(isHomeUrl('/zh-CN?ref=nav')).toBe(true);
    expect(isHomeUrl('/zh-CN/content')).toBe(false);
    expect(isBlogDetailUrl('/zh-CN/blog/init?locale=en')).toBe(true);
    expect(isBlogDetailUrl('/zh-CN/blog')).toBe(false);
  });
});
