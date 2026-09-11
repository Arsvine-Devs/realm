import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const useResponsiveMock = vi.fn();
const layoutRouteModeMock = vi.fn();
const useNotFoundPresenceMock = vi.fn();
const recordMobileTesseractChargeCall = vi.fn();
const recordLeftPanelProps = vi.fn();
const recordTesseractProps = vi.fn();
const recordRainProps = vi.fn();

vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({
    pathname: '/zh-CN/content',
    asPath: '/zh-CN/content',
    query: { locale: 'zh-CN' },
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/dynamic', () => {
  let callCount = 0;
  return {
    default: () => {
      callCount += 1;
      const testIds = ['tesseract-experience', 'rain-effect', 'custom-cursor'];
      const testId = testIds[callCount - 1] ?? 'dynamic-stub';
      return function DynamicStub(props: Record<string, unknown>) {
        if (testId === 'tesseract-experience') recordTesseractProps(props);
        if (testId === 'rain-effect') recordRainProps(props);
        return <div data-testid={testId} />;
      };
    },
  };
});

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudAnimation: () => useAppMock(),
  useHudPower: () => useAppMock(),
  useHudStats: () => useAppMock(),
  useHudTyping: () => useAppMock(),
  useHudPerformance: () => useAppMock(),
}));

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({
    navigateTo: vi.fn(),
    handleBack: vi.fn(),
    isDetailOpen: () => false,
    registerTransitionSurface: vi.fn(),
    pendingUrl: null,
  }),
}));

vi.mock('@/features/navigation/model/LayoutAnchorsContext', () => ({
  useLayoutAnchors: () => ({
    getScrollContainer: () => null,
    align: vi.fn().mockResolvedValue('aligned'),
    isPending: () => false,
  }),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => useResponsiveMock(),
}));

vi.mock('@/features/navigation/model/useDrawerNavigation', () => ({
  default: () => ({
    drawerOpen: false,
    navLinks: [],
    drawerToggleLabel: 'drawer',
    toggleDrawer: vi.fn(),
    closeDrawer: vi.fn(),
  }),
}));

vi.mock('@/features/navigation/model/useLayoutRouteMode', () => ({
  default: () => layoutRouteModeMock(),
}));

vi.mock('@/features/navigation/model/notFoundPresence', () => ({
  useNotFoundPresence: () => useNotFoundPresenceMock(),
}));

vi.mock('@/features/navigation/model/useStandalonePanelState', () => ({
  default: () => ({
    localPanelAnimated: true,
    localLeversVisible: true,
  }),
}));

vi.mock('@/features/navigation/model/useRouteLoadingKind', () => ({
  default: () => ({
    kind: null,
    presentation: 'default',
  }),
}));

vi.mock('@/features/hud/model/useMobileTesseractCharge', () => ({
  default: (options: unknown) => recordMobileTesseractChargeCall(options),
}));

vi.mock('@/features/hud/ui/loading/HomeLoadingScreen', () => ({
  default: () => <div data-testid="home-loading-screen" />,
}));

vi.mock('@/features/music/public', () => ({
  default: () => <div data-testid="music-player" />,
}));

vi.mock('@/features/hud/ui/layout/GlobalHud', () => ({
  default: () => <div data-testid="global-hud" />,
}));

vi.mock('@/features/hud/ui/layout/LeftPanel', () => ({
  default: (props: unknown) => {
    recordLeftPanelProps(props);
    return <div data-testid="left-panel" />;
  },
}));

vi.mock('@/features/hud/ui/layout/RouteLoadingOverlay', () => ({
  default: () => <div data-testid="route-loading-overlay" />,
}));

import MainLayout from '@/app/shell/MainLayout';

function buildAppState(overrides: Record<string, unknown> = {}) {
  return {
    mainVisible: true,
    isInverted: false,
    isTesseractActivated: true,
    animationsComplete: true,
    chargeBattery: vi.fn(),
    handleLoadingComplete: vi.fn(),
    currentTime: '00:00:00',
    hudVisible: true,
    leftPanelAnimated: true,
    leversVisible: true,
    handleActivateTesseract: vi.fn(),
    handleDischargeLeverPull: vi.fn(),
    isDischarging: false,
    powerLevel: 64,
    isFateTypingActive: false,
    displayedFateText: '',
    isEnvParamsTyping: false,
    displayedEnvParams: '',
    envData: null,
    envArtifactStage: 0,
    deactivateTesseract: vi.fn(),
    allowAmbientWebGL: true,
    allowInteractiveWebGL: true,
    allowCustomCursor: true,
    ...overrides,
  };
}

describe('MainLayout adaptive performance gates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useResponsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isDesktop: true });
    useAppMock.mockReturnValue(buildAppState());
    layoutRouteModeMock.mockReturnValue({
      isHome: false,
      isContentPage: true,
      isStandalone: false,
      activeSection: 'content',
    });
    useNotFoundPresenceMock.mockReturnValue(false);
    recordMobileTesseractChargeCall.mockReset();
    recordLeftPanelProps.mockReset();
    recordTesseractProps.mockReset();
    recordRainProps.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('skips optional desktop effects and enables fallback charging in reduced mode', () => {
    useAppMock.mockReturnValue(
      buildAppState({
        allowAmbientWebGL: false,
        allowInteractiveWebGL: false,
        allowCustomCursor: false,
      }),
    );

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.queryByTestId('custom-cursor')).toBeNull();
    expect(screen.queryByTestId('rain-effect')).toBeNull();
    expect(screen.queryByTestId('tesseract-experience')).toBeNull();
    expect(recordMobileTesseractChargeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldUseAutoChargeFallback: true,
        isTesseractActivated: true,
      }),
    );
  });

  it('renders optional desktop effects when full mode allows them', () => {
    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('custom-cursor')).toBeTruthy();
    expect(screen.getByTestId('rain-effect')).toBeTruthy();
    expect(screen.getByTestId('tesseract-experience')).toBeTruthy();
    expect(recordMobileTesseractChargeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldUseAutoChargeFallback: false,
      }),
    );
  });

  it.each([
    ['ambient', recordRainProps],
    ['interactive', recordTesseractProps],
  ])('disables all WebGL effects after an %s context loss', (_kind, recordProps) => {
    const { rerender } = render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    const props = recordProps.mock.lastCall?.[0] as { onContextLost: () => void };
    act(() => {
      props.onContextLost();
    });

    expect(screen.queryByTestId('rain-effect')).toBeNull();
    expect(screen.queryByTestId('tesseract-experience')).toBeNull();
    expect(screen.getByTestId('custom-cursor')).toBeTruthy();
    expect(recordMobileTesseractChargeCall).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shouldUseAutoChargeFallback: true,
        isTesseractActivated: true,
      }),
    );

    rerender(
      <MainLayout>
        <div>updated child</div>
      </MainLayout>,
    );

    expect(screen.queryByTestId('rain-effect')).toBeNull();
    expect(screen.queryByTestId('tesseract-experience')).toBeNull();
  });

  it('restores the full shell when a standalone-shaped route renders not-found', () => {
    layoutRouteModeMock.mockReturnValue({
      isHome: false,
      isContentPage: false,
      isStandalone: true,
      activeSection: 'content',
    });
    useNotFoundPresenceMock.mockReturnValue(true);

    render(
      <MainLayout>
        <div>not found</div>
      </MainLayout>,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('tesseract-experience')).toBeTruthy();
    expect(recordLeftPanelProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isStandalone: false,
      }),
    );
  });

  it('keeps the Tesseract mounted but paused on a valid standalone detail route', () => {
    layoutRouteModeMock.mockReturnValue({
      isHome: false,
      isContentPage: false,
      isStandalone: true,
      activeSection: 'content',
    });

    render(
      <MainLayout>
        <div>detail</div>
      </MainLayout>,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('tesseract-experience')).toBeTruthy();
    expect(recordTesseractProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ paused: true }),
    );
    expect(recordLeftPanelProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isStandalone: true,
      }),
    );
  });
});
