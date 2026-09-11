import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const responsiveMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => responsiveMock(),
}));
vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({ query: { locale: 'en' } }),
}));
vi.mock('@/features/music/ui/music-player/useMusicPlayerState', () => ({
  useMusicPlayerState: () => ({
    audioRef: { current: null },
    currentTrack: null,
    currentTrackIndex: -1,
    handleAudioError: vi.fn(),
    handleNext: vi.fn(),
    handlePrev: vi.fn(),
    isPlaying: false,
    progressPercent: 0,
    selectTrack: vi.fn(),
    shouldPreloadMetadata: false,
    syncPlayState: vi.fn(),
  }),
}));
vi.mock('@/features/music/ui/music-player/useVinylDrag', () => ({
  useVinylDrag: () => ({
    dragOffsetX: 0,
    incomingTrack: null,
    incomingTrackIndex: -1,
    incomingTrackOffsetX: 0,
    isDragging: false,
    setVinylContainer: vi.fn(),
    startDrag: vi.fn(),
  }),
}));
vi.mock('@/features/music/ui/music-player/VinylDeck', () => ({ default: () => null }));
vi.mock('@/features/music/ui/music-player/PlayerControls', () => ({ default: () => null }));
vi.mock('@/features/music/ui/music-player/PlaylistPanel', () => ({ default: () => null }));

import MusicPlayer from '@/features/music/ui/MusicPlayer';

describe('MusicPlayer desktop auto-open', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    responsiveMock.mockReturnValue({ isMobile: false });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cancels the desktop delay when the viewport becomes mobile', async () => {
    const view = render(<MusicPlayer powerLevel={67} />);
    const initialClassName = (view.container.firstElementChild as HTMLElement).className;

    responsiveMock.mockReturnValue({ isMobile: true });
    view.rerender(<MusicPlayer powerLevel={67} />);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect((view.container.firstElementChild as HTMLElement).className).toBe(initialClassName);
  });
});
