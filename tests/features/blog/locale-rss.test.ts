import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/blog/server/blog', () => ({
  getPublicPostsForLocale: async () => [
    {
      slug: 'excerpt-test',
      title: 'Excerpt test',
      excerpt: '',
      date: '2026-11-23',
    },
  ],
  getPostBySlugAndLocale: async () => ({
    content: [
      'Start with [visible words](/link).',
      '',
      '> ~~~spoiler',
      '> HIDDEN_SPOILER_SENTINEL',
      '> ~~~',
      '',
      'Finish with **visible emphasis**.',
      '',
      '~~~text',
      'HIDDEN_CODE_SENTINEL',
      '~~~',
    ].join('\n'),
  }),
}));

import { buildLocaleRssResponse } from '@/features/blog/server/localeRss';
import { GET } from '@/app/rss.xml/route';

describe('RSS redirect', () => {
  it('redirects to the registered site when the upstream request carries a loopback host', () => {
    const response = GET(new Request('https://localhost:12008/rss.xml'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://arsvine.com/zh-CN/rss.xml');
  });
});

describe('RSS excerpt', () => {
  it('summarizes only visible Markdown prose, including nested fenced blocks', async () => {
    const response = await buildLocaleRssResponse('en');
    const xml = await response.text();
    expect(xml).toContain(
      '<description>Start with visible words. Finish with visible emphasis.</description>',
    );
    expect(xml).not.toContain('HIDDEN_SPOILER_SENTINEL');
    expect(xml).not.toContain('HIDDEN_CODE_SENTINEL');
  });
});
