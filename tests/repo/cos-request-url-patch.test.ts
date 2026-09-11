import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('cos-request Node URL compatibility patch', () => {
  it('pins the latest compatible cos-request and registers its patch', () => {
    const workspace = readSource('pnpm-workspace.yaml');

    expect(workspace).toContain('cos-request: 1.3.3');
    expect(workspace).toContain('cos-request@1.3.3: patches/cos-request@1.3.3.patch');
  });

  it('routes request URL parsing through WHATWG URL for absolute SDK requests', () => {
    const patch = readSource('patches/cos-request@1.3.3.patch');

    expect(patch).toContain('function parseRequestUrl (value)');
    expect(patch).toContain('var parsed = new url.URL(value)');
    expect(patch).toContain('self.uri = parseRequestUrl(self.uri)');
    expect(patch).toContain('proxy = parseRequestUrl(proxy)');
    expect(patch).toContain("self.uri = parseRequestUrl(self.uri.href.split('?')[0] + '?' + qs)");
    expect(
      patch
        .split('\n')
        .some((line) => line.startsWith('+') && line.includes('self.uri = url.parse')),
    ).toBe(false);
    expect(
      patch.split('\n').some((line) => line.startsWith('+') && line.includes('proxy = url.parse')),
    ).toBe(false);
  });

  it('keeps the legacy error path explicit for unsupported relative URL forms', () => {
    const patch = readSource('patches/cos-request@1.3.3.patch');

    expect(patch).toContain('invalid/relative URL error path');
    expect(patch).toContain("path: pathname + (search || '')");
    expect(
      patch.split('\n').some((line) => line.startsWith('+') && /return\s+url\.parse/.test(line)),
    ).toBe(false);
  });
});
