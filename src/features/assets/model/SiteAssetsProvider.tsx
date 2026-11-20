import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { PUBLIC_MEDIA_PATH } from '@/shared/lib/media';

const SITE_ASSET_KEYS = [
  'site/about-qr',
  'site/travelling',
  'decor/contour-map',
  'decor/portfolio-title',
  'decor/experience-title',
  'decor/life-title',
  'decor/texture-noise',
] as const;
type SiteAssetKey = (typeof SITE_ASSET_KEYS)[number];

interface SiteAssetsContextValue {
  mediaBase: string;
  getSiteAssetUrl: (key: SiteAssetKey, fallback?: string) => string;
}
const SiteAssetsContext = createContext<SiteAssetsContextValue>({
  mediaBase: PUBLIC_MEDIA_PATH,
  getSiteAssetUrl: (_key, fallback = '') => fallback,
});

const CSS_ASSETS: Partial<Record<SiteAssetKey, string>> = {
  'decor/contour-map': '--site-contour-map',
  'decor/portfolio-title': '--site-portfolio-title',
  'decor/experience-title': '--site-experience-title',
  'decor/life-title': '--site-life-title',
  'decor/texture-noise': '--site-texture-noise',
};

export function SiteAssetsProvider({
  children,
  assets,
  mediaBase,
}: {
  children: ReactNode;
  assets: Record<string, string>;
  mediaBase: string;
}) {
  useEffect(() => {
    const html = document.documentElement;
    for (const [key, property] of Object.entries(CSS_ASSETS) as Array<[SiteAssetKey, string]>) {
      const url = assets[key];
      if (url) html.style.setProperty(property, `url("${url}")`);
      else html.style.removeProperty(property);
    }
  }, [assets]);

  const value = useMemo<SiteAssetsContextValue>(
    () => ({
      mediaBase,
      getSiteAssetUrl: (key, fallback = '') => assets[key] ?? fallback,
    }),
    [assets, mediaBase],
  );
  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
}

export function useSiteAssets() {
  return useContext(SiteAssetsContext);
}
