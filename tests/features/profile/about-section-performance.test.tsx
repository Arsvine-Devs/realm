import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();
const usePowerMock = vi.fn();
const aboutParticleMock = vi.fn();

vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({
    query: { locale: 'zh-CN' },
    asPath: '/zh-CN',
    pathname: '/zh-CN',
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({
    navigateTo: vi.fn(),
  }),
}));

vi.mock('@/features/hud/model/HudProvider', () => ({
  useHudStats: () => useAppMock(),
  useHudPerformance: () => useAppMock(),
  useHudPower: () => usePowerMock(),
}));

vi.mock('@/shared/hooks/useVisitorLanguageCode', () => ({
  default: () => 'zh-CN',
}));

vi.mock('@/features/hud/ui/effects/Noise', () => ({
  default: () => <div data-testid="noise-effect" />,
}));

vi.mock('@/features/profile/ui/AboutParticleImage', () => ({
  default: (props: Record<string, unknown>) => {
    aboutParticleMock(props);
    return <div data-testid="about-particle-image" />;
  },
}));

import AboutSection from '@/features/profile/ui/AboutSection';
import styles from '@/features/profile/styles/ProfileSections.module.scss';

describe('AboutSection adaptive performance', () => {
  beforeEach(() => {
    useAppMock.mockReturnValue({
      runtime: '001:00:00:00',
      currentVisitDuration: '000:00:05:00',
      allowDecorativeMotion: true,
      performanceTier: 'full',
    });
    usePowerMock.mockReturnValue({ isInverted: false });
    aboutParticleMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the noise layer in full mode', () => {
    const { container } = render(<AboutSection aboutSectionRef={{ current: null }} aboutContentRef={{ current: null }} />);
    expect(screen.getByTestId('noise-effect')).toBeTruthy();
    const aboutSection = container.querySelector('#about-section');
    expect(aboutSection?.classList.contains(styles.contentSection)).toBe(true);
    expect(aboutSection?.classList.contains(styles.aboutSection)).toBe(true);
    expect(aboutParticleMock).toHaveBeenLastCalledWith({
      enabled: true,
      inverted: false,
    });
  });

  it('skips the noise layer in reduced mode', () => {
    useAppMock.mockReturnValue({
      runtime: '001:00:00:00',
      currentVisitDuration: '000:00:05:00',
      allowDecorativeMotion: false,
      performanceTier: 'logo-reduced',
    });

    render(<AboutSection aboutSectionRef={{ current: null }} aboutContentRef={{ current: null }} />);
    expect(screen.queryByTestId('noise-effect')).toBeNull();
    expect(aboutParticleMock).toHaveBeenLastCalledWith({
      enabled: false,
      inverted: false,
    });
  });
});
