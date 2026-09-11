import { describe, expect, it } from 'vitest';
import {
  parsePersistedPlayerState,
  readPersistedPlayerStateFromStorage,
} from '@/features/music/ui/music-player/persistence';

describe('music player persistence', () => {
  it('returns null for invalid json', () => {
    expect(parsePersistedPlayerState('{broken', 4)).toBeNull();
  });

  it('clamps track index and negative time values', () => {
    expect(
      parsePersistedPlayerState(
        JSON.stringify({ currentTrackIndex: 99, currentTime: -5, isPlaying: true }),
        4,
      ),
    ).toEqual({
      currentTrackIndex: 3,
      currentTime: 0,
    });
  });

  it('falls back from session to local storage when needed', () => {
    const sessionStorage = {
      getItem: () => null,
    };
    const localStorage = {
      getItem: () => JSON.stringify({ currentTrackIndex: 1, currentTime: 12, isPlaying: false }),
    };

    expect(
      readPersistedPlayerStateFromStorage(sessionStorage, localStorage, 'arsvine:music-player', 4),
    ).toEqual({
      currentTrackIndex: 1,
      currentTime: 12,
    });
  });

  it('accepts legacy isPlaying data without restoring autoplay intent', () => {
    expect(
      parsePersistedPlayerState(
        JSON.stringify({
          currentTrackIndex: 2,
          currentTime: 8,
          isPlaying: true,
          trackId: 'legacy-track',
        }),
        4,
      ),
    ).toEqual({
      currentTrackIndex: 2,
      currentTime: 8,
      trackId: 'legacy-track',
    });
  });
});
