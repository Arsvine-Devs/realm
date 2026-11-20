import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedPostGate from '@/features/blog/ui/blog/ProtectedPostGate';
import BlogStateShell from '@/features/blog/ui/blog/BlogStateShell';
import BlogDetailScaffold from '@/features/blog/ui/blog/BlogDetailScaffold';
import type { BlogPostMeta } from '@/shared/types';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    onNavigate: _onNavigate,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
    onNavigate?: (event: { preventDefault(): void }) => void;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const dictionaries: Record<string, Record<string, string>> = {
      'pages.access': {
        heading: '验证访问',
        description: '输入动态验证码以继续访问受保护内容。',
        tokenLabel: '验证码',
        hint: '请输入当前 6 位验证码。',
        verifying: '验证中',
        invalidToken: '验证码无效',
      },
      common: {
        endTransmission: '传输结束',
        returnToIndex: '返回索引',
        signalFragment: '验证访问',
      },
      nav: {
        top: '顶部',
        content: '正文',
        end: '末尾',
      },
    };

    return (key: string) => dictionaries[namespace]?.[key] ?? `${namespace}.${key}`;
  },
}));

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudPower: () => ({ isInverted: false }),
}));

const navigateTo = vi.fn();

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({ navigateTo }),
}));

vi.mock('@/features/navigation/model/useNavigationIntentPrefetch', () => ({
  default: () => vi.fn(),
}));

vi.mock('@/shared/ui/HreflangLinks', () => ({
  default: () => null,
}));

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

beforeEach(() => {
  vi.useFakeTimers();
  navigateTo.mockReset();
});

afterEach(() => {
  cleanup();
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

const allPosts: BlogPostMeta[] = [
  {
    slug: 'prev-post',
    title: 'Prev Post',
    date: '2026-06-01',
    excerpt: 'Prev excerpt',
    tags: [],
    readingMinutes: 1,
    access: { mode: 'public' },
  },
  {
    slug: 'protected-post',
    title: 'Protected Post',
    date: '2026-06-08',
    excerpt: '',
    tags: [],
    readingMinutes: 0,
    access: { mode: 'totp' },
  },
  {
    slug: 'next-post',
    title: 'Next Post',
    date: '2026-06-10',
    excerpt: 'Next excerpt',
    tags: [],
    readingMinutes: 1,
    access: { mode: 'public' },
  },
];

describe('protected blog detail navigation scaffold', () => {
  it('keeps footer navigation and right-side back rail in authRequired state', () => {
    render(
      <ProtectedPostGate
        locale="zh-CN"
        meta={allPosts[1]}
        allPosts={allPosts}
        defaultContentLocale="zh-CN"
        group="family"
        nextContentLocale="zh-CN"
        onVerified={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'BACK' })).toBeTruthy();
    expect(screen.getByText('Prev Post')).toBeTruthy();
    expect(screen.getByText('Next Post')).toBeTruthy();
    expect(screen.getByText('验证码')).toBeTruthy();
  });

  it('keeps footer navigation and right-side back rail in loading shell state', () => {
    render(
      <BlogStateShell
        locale="zh-CN"
        meta={allPosts[1]}
        allPosts={allPosts}
        defaultContentLocale="zh-CN"
        signalLabel="验证访问"
        statusText="正在解码"
        isProtected
      />,
    );

    expect(screen.getByRole('button', { name: 'BACK' })).toBeTruthy();
    expect(screen.getByText('Prev Post')).toBeTruthy();
    expect(screen.getByText('Next Post')).toBeTruthy();
    expect(screen.getByText('正在解码')).toBeTruthy();
  });

  it('renders shared scaffold slots without dropping footer navigation', () => {
    render(
      <BlogDetailScaffold
        locale="zh-CN"
        meta={allPosts[1]}
        allPosts={allPosts}
        defaultContentLocale="zh-CN"
        headerEntered
        headerContent={<div>Header Slot</div>}
        contentContent={<div>Body Slot</div>}
      />,
    );

    expect(screen.getByText('Header Slot')).toBeTruthy();
    expect(screen.getByText('Body Slot')).toBeTruthy();
    expect(screen.getByText('Prev Post')).toBeTruthy();
    expect(screen.getByText('Next Post')).toBeTruthy();
  });

  it('routes standalone back controls to the canonical blog content hash', () => {
    const currentPost = {
      slug: 'protected-post',
      title: 'Protected Post',
      date: '2026-06-08',
      excerpt: '',
      tags: [],
      readingMinutes: 0,
      access: { mode: 'totp' as const },
    };

    render(
      <BlogDetailScaffold
        locale="zh-CN"
        meta={currentPost}
        allPosts={[currentPost]}
        defaultContentLocale="zh-CN"
        headerEntered
        headerContent={<div>Header Slot</div>}
        contentContent={<div>Body Slot</div>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'BACK' }));
    expect(navigateTo).toHaveBeenCalledWith('/zh-CN/content#blog');

    const footerBackLinks = screen.getAllByRole('link', { name: /返回索引/i });
    expect(footerBackLinks).toHaveLength(2);
    footerBackLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBe('/zh-CN/content#blog');
    });
  });

  it('falls back to the canonical blog index when adjacent slugs are unsafe', () => {
    const unsafePosts: BlogPostMeta[] = [
      {
        ...allPosts[0],
        slug: 'https://evil.test/prev',
        title: 'Unsafe Prev',
      },
      allPosts[1],
      {
        ...allPosts[2],
        slug: '../escape',
        title: 'Unsafe Next',
      },
    ];

    render(
      <BlogDetailScaffold
        locale="zh-CN"
        meta={unsafePosts[1]}
        allPosts={unsafePosts}
        defaultContentLocale="zh-CN"
        headerEntered
        headerContent={<div>Header Slot</div>}
        contentContent={<div>Body Slot</div>}
      />,
    );

    const unsafePrevLink = screen.getByRole('link', { name: /Unsafe Prev/i });
    const unsafeNextLink = screen.getByRole('link', { name: /Unsafe Next/i });

    expect(unsafePrevLink.getAttribute('href')).toBe('/zh-CN/content#blog');
    expect(unsafeNextLink.getAttribute('href')).toBe('/zh-CN/content#blog');

    expect(unsafePrevLink.getAttribute('href')).toBe('/zh-CN/content#blog');
    expect(unsafeNextLink.getAttribute('href')).toBe('/zh-CN/content#blog');
  });
});
