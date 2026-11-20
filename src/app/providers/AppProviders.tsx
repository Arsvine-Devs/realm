'use client';

import type { ReactNode } from 'react';

import { HudProvider } from '../../features/hud/model/HudProvider';
import { SiteAssetsProvider } from '../../features/assets/model/SiteAssetsProvider';
import { classifyRoutePathname } from '@/features/navigation/model/contentHashNavigation';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';
import { TransitionProvider } from '../../features/navigation/model/TransitionProvider';
import { LayoutAnchorsProvider } from '../../features/navigation/model/LayoutAnchorsContext';
import { LocalePageStateProvider } from '@/features/navigation/model/LocalePageState';
import { VisitorStatsProvider } from '@/features/visitor-stats/model/VisitorStatsProvider';

interface AppProvidersProps {
  children: ReactNode;
  assets: Record<string, string>;
  mediaBase: string;
}

export default function AppProviders({ children, assets, mediaBase }: AppProvidersProps) {
  const { pathname } = useNavigationRuntime();
  return (
    <SiteAssetsProvider assets={assets} mediaBase={mediaBase}>
      <VisitorStatsProvider>
        <HudProvider allowOpening={classifyRoutePathname(pathname) === 'home'}>
          <LocalePageStateProvider>
            <LayoutAnchorsProvider>
              <TransitionProvider>{children}</TransitionProvider>
            </LayoutAnchorsProvider>
          </LocalePageStateProvider>
        </HudProvider>
      </VisitorStatsProvider>
    </SiteAssetsProvider>
  );
}
