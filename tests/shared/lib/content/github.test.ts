import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

// 默认把 env 抹平，每个 case 自己 setContentEnv/clearContentEnv。
function setContentEnv() {
  process.env.GITHUB_OWNER = 'acme';
  process.env.GITHUB_REPO = 'content';
  process.env.GITHUB_BRANCH = 'main';
  process.env.GITHUB_READ_TOKEN = 'test-token';
}

function clearContentEnv() {
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_BRANCH;
  delete process.env.GITHUB_READ_TOKEN;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('hasContentRepoConfig', () => {
  it('returns false when any of the three required envs is missing', async () => {
    vi.resetModules();
    process.env.GITHUB_OWNER = 'acme';
    process.env.GITHUB_REPO = 'content';
    delete process.env.GITHUB_READ_TOKEN;
    const { hasContentRepoConfig } = await import('@/shared/lib/content/github');
    expect(hasContentRepoConfig()).toBe(false);
  });

  it('returns true when all three are set', async () => {
    vi.resetModules();
    setContentEnv();
    const { hasContentRepoConfig } = await import('@/shared/lib/content/github');
    expect(hasContentRepoConfig()).toBe(true);
  });
});

describe('fetchGitHubContent', () => {
  beforeEach(() => {
    setContentEnv();
    vi.resetModules();
  });

  it('throws with a clear error when content repo is not configured', async () => {
    clearContentEnv();
    vi.resetModules();
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('blog/init.mdx')).rejects.toThrow(/not configured/);
  });

  it('returns the raw text on 200', async () => {
    const fetchMock = vi.fn(async () => new Response('# hello', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    const text = await fetchGitHubContent('blog/init.mdx');
    expect(text).toBe('# hello');
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as unknown as [unknown, RequestInit];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.origin).toBe('https://api.github.com');
    expect(parsedUrl.pathname).toBe('/repos/acme/content/contents/blog/init.mdx');
    expect(parsedUrl.searchParams.get('ref')).toBe('main');
    expect((init.headers as Record<string, string>).Accept).toBe('application/vnd.github.raw');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('rejects dangerous paths before issuing fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('https://evil.test/owned')).rejects.toThrow(
      /Invalid content path/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on 404 with status info in the message', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('nope', { status: 404, statusText: 'Not Found' }),
    );
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('blog/init.mdx')).rejects.toThrow(/404/);
  });

  it('throws on 500', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('boom', { status: 500, statusText: 'Server Error' }),
    );
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('blog/init.mdx')).rejects.toThrow(/500/);
  });

  it('translates an AbortSignal.timeout abort into a "Timed out" error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('aborted');
        err.name = 'TimeoutError';
        throw err;
      }),
    );
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('blog/init.mdx')).rejects.toThrow(/Timed out/);
  });

  it('forwards non-timeout errors unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network gone');
      }),
    );
    const { fetchGitHubContent } = await import('@/shared/lib/content/github');
    await expect(fetchGitHubContent('blog/init.mdx')).rejects.toThrow(/network gone/);
  });
});

describe('getContentBlogIndex', () => {
  beforeEach(() => {
    setContentEnv();
    vi.resetModules();
  });

  it('returns the bundled fallback index when content repo is not configured', async () => {
    clearContentEnv();
    vi.resetModules();
    const { getContentBlogIndex } = await import('@/shared/lib/content/github');
    const index = await getContentBlogIndex();
    expect(index.posts).toHaveLength(1);
    expect(index.posts[0]?.slug).toBe('init');
    expect(index.posts[0]?.variants['zh-CN']?.title).toBe('初次见面');
    expect(index.version).toBe(1);
  });

  it('returns the bundled fallback index on 404 (fresh private repos)', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('missing', { status: 404, statusText: 'Not Found' }),
    );
    const { getContentBlogIndex } = await import('@/shared/lib/content/github');
    const index = await getContentBlogIndex();
    expect(index.posts).toHaveLength(1);
    expect(index.posts[0]?.slug).toBe('init');
    expect(index.posts[0]?.variants['zh-CN']?.title).toBe('初次见面');
  });

  it('caches the index within TTL', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ version: 1, updatedAt: 'x', posts: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { getContentBlogIndex } = await import('@/shared/lib/content/github');
    await getContentBlogIndex();
    await getContentBlogIndex();
    await getContentBlogIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to bundled content when the remote index shape is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ version: 1, posts: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const { getContentBlogIndex } = await import('@/shared/lib/content/github');

    await expect(getContentBlogIndex()).resolves.toMatchObject({
      version: 1,
      posts: [expect.objectContaining({ slug: 'init' })],
    });
  });

  it('falls back to stale cache when subsequent fetch fails', async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({ version: 1, updatedAt: 'x', posts: [{ slug: 'init' }] }),
          {
            status: 200,
          },
        );
      }
      return new Response('boom', { status: 500, statusText: 'Server Error' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getContentBlogIndex } = await import('@/shared/lib/content/github');
    const first = await getContentBlogIndex();
    expect(first.posts[0]?.slug).toBe('init');
    // 强制让缓存过期
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 70_000);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const second = await getContentBlogIndex();
    expect(second.posts[0]?.slug).toBe('init');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('normalizeContentPath', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('keeps repo-relative paths and encodes each segment', async () => {
    const { normalizeContentPath } = await import('@/shared/lib/content/github');
    expect(normalizeContentPath('blog/世界 notes.mdx')).toBe('blog/%E4%B8%96%E7%95%8C%20notes.mdx');
  });

  it.each([
    '../secrets.txt',
    './draft.mdx',
    '/etc/passwd',
    '\\\\server\\share',
    'https://evil.test/payload',
    '//evil.test/payload',
    'blog\\draft.mdx',
    'blog/draft.mdx?lang=en',
    'blog/draft.mdx#frag',
    'blog/%2e%2e/draft.mdx',
    'blog/%2E/draft.mdx',
    'blog/%2Fescape.mdx',
    'blog/%5Cescape.mdx',
  ])('rejects dangerous path %s', async (input) => {
    const { normalizeContentPath } = await import('@/shared/lib/content/github');
    expect(() => normalizeContentPath(input)).toThrow(/Invalid content path/);
  });
});
