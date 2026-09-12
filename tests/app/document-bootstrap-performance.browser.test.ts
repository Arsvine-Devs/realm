import { describe, expect, it, vi } from 'vitest';
import { buildDocumentBootstrapScript } from '@/shared/lib/document-bootstrap';

function evaluateBootstrap(
  script: string,
  env: {
    reduceMotion?: boolean;
    saveData?: boolean;
    effectiveType?: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    pathname?: string;
  } = {},
) {
  const attrs = new Map<string, string>();
  const html = {
    lang: '',
    setAttribute: vi.fn((key: string, value: string) => {
      attrs.set(key, value);
    }),
    getAttribute: vi.fn((key: string) => attrs.get(key) ?? null),
    removeAttribute: vi.fn((key: string) => {
      attrs.delete(key);
    }),
  };

  const connection = {
    saveData: env.saveData ?? false,
    effectiveType: env.effectiveType ?? '4g',
  };

  const matchMedia = vi.fn(() => ({
    matches: env.reduceMotion ?? false,
  }));

  const fn = new Function(
    'document',
    'matchMedia',
    'navigator',
    'sessionStorage',
    'localStorage',
    script,
  );
  fn(
    { documentElement: html, cookie: '', location: { pathname: env.pathname ?? '/zh-CN' } },
    matchMedia,
    {
      connection,
      mozConnection: connection,
      webkitConnection: connection,
      deviceMemory: env.deviceMemory,
      hardwareConcurrency: env.hardwareConcurrency,
    },
    { getItem: () => null },
    { getItem: () => null },
  );

  return { attrs, html, matchMedia };
}

describe('buildDocumentBootstrapScript performance tier', () => {
  it('sets the document language from the locale-prefixed pathname before hydration', () => {
    expect(
      evaluateBootstrap(buildDocumentBootstrapScript(), { pathname: '/en/copyright' }).html.lang,
    ).toBe('en-US');
    expect(
      evaluateBootstrap(buildDocumentBootstrapScript(), { pathname: '/zh-TW/content' }).html.lang,
    ).toBe('zh-Hant-TW');
  });

  it('does not lower visual effects for the browser network estimate alone', () => {
    const script = buildDocumentBootstrapScript();
    const { attrs } = evaluateBootstrap(script, { effectiveType: '3g' });
    expect(attrs.get('data-performance-tier')).toBe('full');
    expect(attrs.get('data-performance-reason')).toBe('none');
    expect(attrs.get('data-decorative-motion')).toBe('on');
  });

  it('does not lower visual effects for coarse hardware hints', () => {
    const script = buildDocumentBootstrapScript();
    expect(evaluateBootstrap(script, { deviceMemory: 4 }).attrs.get('data-performance-tier')).toBe(
      'full',
    );
    expect(
      evaluateBootstrap(script, { hardwareConcurrency: 4 }).attrs.get('data-performance-tier'),
    ).toBe('full');
  });

  it('writes minimal tier for reduced motion', () => {
    const { attrs } = evaluateBootstrap(buildDocumentBootstrapScript(), { reduceMotion: true });
    expect(attrs.get('data-performance-tier')).toBe('minimal');
    expect(attrs.get('data-performance-reason')).toBe('reduced-motion');
  });

  it('honors the explicit Save-Data preference', () => {
    const { attrs } = evaluateBootstrap(buildDocumentBootstrapScript(), { saveData: true });
    expect(attrs.get('data-performance-tier')).toBe('motion-reduced');
    expect(attrs.get('data-performance-reason')).toBe('save-data');
  });

  it('keeps full tier when no low-power signals are present', () => {
    const script = buildDocumentBootstrapScript();
    const { attrs } = evaluateBootstrap(script);
    expect(attrs.get('data-performance-tier')).toBe('full');
    expect(attrs.get('data-logo-effects')).toBe('on');
    expect(attrs.get('data-custom-cursor')).toBe('on');
  });
});
