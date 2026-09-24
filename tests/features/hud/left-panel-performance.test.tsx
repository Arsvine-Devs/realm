import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const finePointerMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudPerformance: () => useAppMock(),
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  default: () => finePointerMock(),
}));

vi.mock('@/features/hud/ui/ActivationLever', () => ({
  default: () => <div data-testid="activation-lever" />,
}));

import LeftPanel from '@/features/hud/ui/layout/LeftPanel';

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'zh-CN',
    leftPanelAnimated: true,
    mainVisible: true,
    leversVisible: true,
    handleActivateTesseract: vi.fn(),
    isTesseractActivated: false,
    handleDischargeLeverPull: vi.fn(),
    isDischarging: false,
    activeSection: 'content',
    handleGlobalBackClick: vi.fn(),
    navLinks: [],
    handleLeftNavLinkClick: vi.fn(),
    powerLevel: 67,
    isFateTypingActive: false,
    displayedFateText: '',
    accessibleFateText: '',
    isEnvParamsTyping: false,
    displayedEnvParams: '',
    envArtifactStage: 0,
    isInverted: false,
    drawerOpen: false,
    isStandalone: false,
    isTesseractDragging: false,
    powerDisplayRef: { current: null },
    batteryIconRef: { current: null },
    envData: null,
    ...overrides,
  } as const;
}

describe('LeftPanel adaptive performance', () => {
  beforeEach(() => {
    finePointerMock.mockReturnValue(true);
    useAppMock.mockReturnValue({ allowLogoEffects: true, performanceTier: 'full' });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('attaches the logo motion listener in full mode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<LeftPanel {...buildProps()} />);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
  });

  it('skips logo effects in logo-reduced mode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    useAppMock.mockReturnValue({ allowLogoEffects: false, performanceTier: 'logo-reduced' });

    const { container } = render(<LeftPanel {...buildProps()} />);

    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
    expect(container.querySelector('[class*="logoContainer"]')).not.toBeNull();
  });

  it('atomically clears active logo work when the capability is disabled', () => {
    const requestSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(41);
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const view = render(<LeftPanel {...buildProps()} />);
    const motion = view.container.querySelector('[class*="logoMotion"]') as HTMLElement;

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 1200, clientY: 600 }));
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(motion.getAttribute('data-logo-motion')).toBe('active');

    useAppMock.mockReturnValue({ allowLogoEffects: false, performanceTier: 'logo-reduced' });
    view.rerender(<LeftPanel {...buildProps()} />);

    expect(cancelSpy).toHaveBeenCalledWith(41);
    expect(motion.getAttribute('data-logo-motion')).toBeNull();
    expect(motion.style.getPropertyValue('--avatar-split')).toBe('');
    expect(motion.style.transform).toBe('');
  });

  it('does not attach logo effects for coarse pointers or hidden standalone panels', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    finePointerMock.mockReturnValue(false);
    const view = render(<LeftPanel {...buildProps()} />);
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });

    finePointerMock.mockReturnValue(true);
    view.rerender(<LeftPanel {...buildProps({ isStandalone: true })} />);
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
  });

  it('keeps one accessible Travelling link with desktop and compact mobile content', () => {
    const { container } = render(<LeftPanel {...buildProps()} />);
    const links = container.querySelectorAll('a[href^="https://www.travellings.cn/arsvine"]');

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('aria-label')).toBe('travellingLabel');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[0].querySelector('img')?.getAttribute('alt')).toBe('');
    expect(links[0].querySelector('[class*="travellingMobileBadge"]')?.textContent).toBe(
      'travellingLabel',
    );
    expect(links[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
