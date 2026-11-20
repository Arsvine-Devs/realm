import { describe, expect, it } from 'vitest';
import { catalogNamespaces, serviceOrigins, siteConfig } from '@arsvine/site-config';

describe('canonical site-config contract', () => {
  it('exposes stable Arsvine origins including Ripple and Status', () => {
    expect(serviceOrigins.realm).toBe('https://arsvine.com');
    expect(serviceOrigins.ripple).toBe('https://ripple.arsvine.com');
    expect(serviceOrigins.auth).toBe('https://auth.arsvine.com');
    expect(serviceOrigins.content).toBe('https://content.arsvine.com');
    expect(serviceOrigins.status).toBe('https://status.arsvine.com');
  });

  it('keeps catalog namespaces and Content pointer aligned', () => {
    expect(catalogNamespaces.realmContent).toBe('realm-content');
    expect(catalogNamespaces.ripple).toBe('ripple');
    expect(siteConfig.content.pointerKey).toBe('realm-content/current.json');
  });
});
