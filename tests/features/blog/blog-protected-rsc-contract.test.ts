import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('protected blog App Router contract', () => {
  it('keeps protected branches free of MDX serialization and client variants', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/blog/[slug]/page.tsx'),
      'utf8',
    );
    const protectedBranch = source.slice(
      source.indexOf("if (access.mode !== 'public')"),
      source.indexOf('const post ='),
    );
    expect(protectedBranch).toContain('mdxSource={null}');
    expect(protectedBranch).toContain('contentVariants={{}}');
    expect(protectedBranch).not.toContain('serialize(');
    expect(protectedBranch).not.toContain('getPostBySlugAndLocale(');
  });
});
