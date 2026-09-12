import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAppMock = vi.fn();

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
}));

vi.mock('@/features/visitor-stats/public', () => ({
  useVisitorStats: () => useAppMock(),
}));

vi.mock('@/shared/hooks/useVisitorLanguageCode', () => ({
  default: () => 'zh-CN',
}));

vi.mock('@/features/hud/ui/effects/Noise', () => ({
  default: () => <div data-testid="noise-effect" />,
}));

import AboutSection from '@/features/profile/ui/AboutSection';
import styles from '@/features/profile/styles/ProfileSections.module.scss';

describe('AboutSection adaptive performance', () => {
  beforeEach(() => {
    useAppMock.mockReturnValue({
      runtime: '001:00:00:00',
      totalVisitors: 42,
      todayVisitors: 3,
      allowDecorativeMotion: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the noise layer in full mode', () => {
    const { container } = render(
      <AboutSection aboutSectionRef={{ current: null }} aboutContentRef={{ current: null }} />,
    );
    expect(screen.getByTestId('noise-effect')).toBeTruthy();
    const aboutSection = container.querySelector('#about-section');
    expect(aboutSection?.classList.contains(styles.contentSection)).toBe(true);
    expect(aboutSection?.classList.contains(styles.aboutSection)).toBe(true);
  });

  it('skips the noise layer in reduced mode', () => {
    useAppMock.mockReturnValue({
      runtime: '001:00:00:00',
      totalVisitors: 42,
      todayVisitors: 3,
      allowDecorativeMotion: false,
    });

    render(
      <AboutSection aboutSectionRef={{ current: null }} aboutContentRef={{ current: null }} />,
    );
    expect(screen.queryByTestId('noise-effect')).toBeNull();
  });
});
