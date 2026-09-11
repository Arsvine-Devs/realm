import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildManagedAssetUrl, normalizeCdnBase } from '@/shared/lib/cdn';

const SITE_ASSET_KEYS = [
  'site/about-qr',
  'site/travelling',
  'decor/contour-map',
  'decor/portfolio-title',
  'decor/experience-title',
  'decor/life-title',
  'decor/texture-noise',
] as const;
export type SiteAssetKey = (typeof SITE_ASSET_KEYS)[number];

interface SiteAssetRecord {
  objectKey: string;
  alt?: string;
  width?: number;
  height?: number;
}
interface SiteAssetsContextValue {
  getSiteAssetUrl: (key: SiteAssetKey, fallback?: string) => string;
}
const SiteAssetsContext = createContext<SiteAssetsContextValue>({
  getSiteAssetUrl: (_key, fallback = '') => fallback,
});

const CSS_ASSETS: Partial<Record<SiteAssetKey, string>> = {
  'decor/contour-map': '--site-contour-map',
  'decor/portfolio-title': '--site-portfolio-title',
  'decor/experience-title': '--site-experience-title',
  'decor/life-title': '--site-life-title',
  'decor/texture-noise': '--site-texture-noise',
};

function isValidRecord(value: unknown): value is SiteAssetRecord {
  if (!value || typeof value !== 'object') return false;
  const objectKey = (value as SiteAssetRecord).objectKey;
  return (
    typeof objectKey === 'string' &&
    (objectKey.startsWith('realm/') || objectKey.startsWith('shared/'))
  );
}

export function getSiteAssetManifestUrl(base: string, version: string) {
  const url = new URL(`${base}/realm/site-catalog/versions/${version}/assets.json`);

  // EdgeOne can retain a pre-CORS response for an immutable manifest path.
  // Keep every site origin in a separate cache namespace so a stale header
  // variant cannot block production, beta, or local development clients.
  if (typeof window !== 'undefined') {
    url.searchParams.set('cors-origin', window.location.origin);
  }

  return url.toString();
}

export function SiteAssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Partial<Record<SiteAssetKey, SiteAssetRecord>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const base = normalizeCdnBase();
        const pointerResponse = await fetch(`${base}/realm/site-catalog/current.json`, {
          signal: controller.signal,
          cache: 'no-cache',
        });
        if (!pointerResponse.ok) return;
        const pointer = (await pointerResponse.json()) as { version?: string };
        if (!pointer.version || !/^\d{8}T\d{6}Z$/.test(pointer.version)) return;
        const manifestResponse = await fetch(getSiteAssetManifestUrl(base, pointer.version), {
          signal: controller.signal,
        });
        if (!manifestResponse.ok) return;
        const manifest = (await manifestResponse.json()) as { assets?: Record<string, unknown> };
        const next: Partial<Record<SiteAssetKey, SiteAssetRecord>> = {};
        for (const key of SITE_ASSET_KEYS) {
          const record = manifest.assets?.[key];
          if (isValidRecord(record)) next[key] = record;
        }
        setAssets(next);
      } catch (error) {
        if (!controller.signal.aborted && process.env.NODE_ENV !== 'production')
          console.warn('[site-assets] manifest unavailable', error);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    for (const [key, property] of Object.entries(CSS_ASSETS) as Array<[SiteAssetKey, string]>) {
      const record = assets[key];
      if (record)
        html.style.setProperty(property, `url("${buildManagedAssetUrl(record.objectKey)}")`);
      else html.style.removeProperty(property);
    }
  }, [assets]);

  const value = useMemo<SiteAssetsContextValue>(
    () => ({
      getSiteAssetUrl: (key, fallback = '') =>
        assets[key] ? buildManagedAssetUrl(assets[key]!.objectKey) : fallback,
    }),
    [assets],
  );
  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
}

export function useSiteAssets() {
  return useContext(SiteAssetsContext);
}
