import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('GEO and ISR rendering contract', () => {
  it('keeps request cookies out of the locale root layout so blog routes remain prerenderable', () => {
    const rootLayout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const localeLayout = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/layout.tsx'),
      'utf8',
    );
    const documentBootstrapScript = readFileSync(
      resolve(process.cwd(), 'src/app/providers/DocumentBootstrapScript.tsx'),
      'utf8',
    );
    const blogPage = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/blog/[slug]/page.tsx'),
      'utf8',
    );

    expect(rootLayout).not.toContain("from 'next/headers'");
    expect(rootLayout).not.toContain('cookies()');
    expect(rootLayout).toContain(
      '<DocumentBootstrapScript script={buildDocumentBootstrapScript()} />',
    );
    expect(rootLayout).not.toMatch(/<script\s+dangerouslySetInnerHTML/);
    expect(localeLayout).not.toContain('<html');
    expect(localeLayout).not.toContain('<body');
    expect(documentBootstrapScript).toContain('useServerInsertedHTML');
    expect(documentBootstrapScript).toContain('id="document-bootstrap"');
    expect(documentBootstrapScript).toContain('return null;');
    expect(blogPage).toContain('export const revalidate = 300;');
  });

  it('applies proxy-issued GEO_COUNTRY only in the synchronous document bootstrap', () => {
    const bootstrap = readFileSync(
      resolve(process.cwd(), 'src/shared/lib/document-bootstrap.ts'),
      'utf8',
    );

    expect(bootstrap).toContain('GEO_COUNTRY');
    expect(bootstrap).toContain("html.setAttribute('data-country', country)");
  });
});
