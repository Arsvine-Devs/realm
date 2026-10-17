import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { catalogNamespaces, serviceOrigins, siteConfig } from '@arsvine/site-config';

describe('canonical site-config contract', () => {
  it('exposes stable Arsvine origins including Ripple and Status', () => {
    expect(serviceOrigins.realm).toBe('https://arsvine.com');
    expect(serviceOrigins.ripple).toBe('https://ripple.arsvine.com');
    expect(serviceOrigins.auth).toBe('https://auth.arsvine.com');
    expect(serviceOrigins.content).toBe('https://content.arsvine.com');
    expect(serviceOrigins.cdn).toBe('https://cdn.arsvine.com');
    expect(serviceOrigins.status).toBe('https://status.arsvine.com');
  });

  it('keeps catalog namespaces and Content pointer aligned', () => {
    expect(catalogNamespaces.realmContent).toBe('realm-content');
    expect(catalogNamespaces.ripple).toBe('ripple');
    expect(siteConfig.content.pointerKey).toBe('realm-content/current.json');
    expect(siteConfig.ripple.musicPointer).toBe('ripple/catalog/current.json');
  });

  it('mirrors the Platform package into packages/site-config', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'packages/site-config/package.json'), 'utf8'),
    );
    expect(pkg.name).toBe('@arsvine/site-config');
    expect(pkg._arsvineSource).toMatch(/^platform\/packages\/site-config@/);
  });
});
