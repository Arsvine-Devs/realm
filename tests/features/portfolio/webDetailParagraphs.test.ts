import { describe, expect, it } from 'vitest';

import { parseWebDetailParagraph } from '@/features/portfolio/ui/detail/webDetailParagraphs';

describe('parseWebDetailParagraph', () => {
  it('keeps plain text when there are no tokens or links', () => {
    expect(parseWebDetailParagraph('plain text', [])).toEqual([
      { type: 'text', text: 'plain text' },
    ]);
  });

  it('parses default, github, and bilibili markdown links', () => {
    const segments = parseWebDetailParagraph(
      'See [site](https://example.com) [repo](https://github.com/test/repo) [video](https://www.bilibili.com/video/BV1xx)',
      [],
    );

    expect(segments).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'link', text: 'site', href: 'https://example.com/', variant: 'default' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'repo', href: 'https://github.com/test/repo', variant: 'github' },
      { type: 'text', text: ' ' },
      {
        type: 'link',
        text: 'video',
        href: 'https://www.bilibili.com/video/BV1xx',
        variant: 'bilibili',
      },
    ]);
  });

  it('downgrades unsafe urls to plain text and avoids fake hostname icon matches', () => {
    const segments = parseWebDetailParagraph(
      'Bad [js](javascript:alert) [data](data:text/html,boom) [fake](https://github.com.evil.test/repo)',
      [],
    );

    expect(segments).toEqual([
      { type: 'text', text: 'Bad ' },
      { type: 'text', text: 'js' },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'data' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'fake', href: 'https://github.com.evil.test/repo', variant: 'default' },
    ]);
  });

  it('matches copyable tokens with literal escaping and preserves surrounding text', () => {
    const segments = parseWebDetailParagraph('Token: foo.bar and done', [
      { pattern: 'foo.bar', label: 'copy me' },
    ]);

    expect(segments).toEqual([
      { type: 'text', text: 'Token: ' },
      { type: 'copyable', text: 'foo.bar', label: 'copy me', tokenIndex: 0 },
      { type: 'text', text: ' and done' },
    ]);
  });
});
