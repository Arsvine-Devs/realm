import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicPlayerState } from '@/features/music/ui/music-player/useMusicPlayerState';
import type { MusicTrack } from '@/features/music/contracts/musicTrack';

const playlist: MusicTrack[] = [
  {
    id: 'track-one',
    title: 'Track One',
    artist: 'Artist One',
    src: 'https://cdn.arsvine.com/music/track-one.m4a',
  },
  {
    id: 'track-two',
    title: 'Track Two',
    artist: 'Artist Two',
    src: 'https://cdn.arsvine.com/music/track-two.m4a',
  },
];

function MusicPlayerStateHarness() {
  const { audioRef, currentTrack, handleNext, handlePrev, isPlaying, selectTrack, syncPlayState } =
    useMusicPlayerState({ playlist });

  return (
    <div>
      {/* The fixture models the media API only and contains no user-facing content. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- this test fixture has no media track. */}
      <audio ref={audioRef} data-testid="audio" />
      <div data-testid="current-track">{currentTrack.title}</div>
      <div data-testid="playing-state">{String(isPlaying)}</div>
      <button type="button" onClick={() => syncPlayState(true)}>
        play
      </button>
      <button type="button" onClick={() => selectTrack(1)}>
        track-two
      </button>
      <button type="button" onClick={() => selectTrack(0)}>
        track-one
      </button>
      <button type="button" onClick={handlePrev}>
        previous
      </button>
      <button type="button" onClick={handleNext}>
        next
      </button>
    </div>
  );
}

describe('useMusicPlayerState audio loading', () => {
  const playMock = vi.fn();
  const loadMock = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    playMock.mockReset().mockResolvedValue(undefined);
    loadMock.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(loadMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not request audio on initial render', () => {
    render(<MusicPlayerStateHarness />);

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBeNull();
    expect(loadMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('current-track').textContent).toBe('Track One');
    expect(screen.getByTestId('playing-state').textContent).toBe('false');
  });

  it('loads and plays only after the play control is clicked', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(playlist[0].src);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('does not reload the current source when play is requested again', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'play' }));

    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('loads and plays the selected track after a user track change', () => {
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'track-two' }));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(playlist[1].src);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
  });

  it('allows a user selection to replace the restored track id', () => {
    window.sessionStorage.setItem(
      'arsvine:music-player',
      JSON.stringify({
        currentTrackIndex: 1,
        currentTime: 42,
        trackId: 'track-two',
      }),
    );

    render(<MusicPlayerStateHarness />);

    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
    fireEvent.click(screen.getByRole('button', { name: 'track-one' }));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(playlist[0].src);
    expect(screen.getByTestId('current-track').textContent).toBe('Track One');
  });

  it('allows previous and next to replace the restored track id', () => {
    window.sessionStorage.setItem(
      'arsvine:music-player',
      JSON.stringify({
        currentTrackIndex: 1,
        trackId: 'track-two',
      }),
    );

    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByTestId('current-track').textContent).toBe('Track One');

    fireEvent.click(screen.getByRole('button', { name: 'previous' }));
    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
  });

  it('falls back to the persisted index when the persisted track id is stale', () => {
    window.sessionStorage.setItem(
      'arsvine:music-player',
      JSON.stringify({
        currentTrackIndex: 1,
        trackId: 'removed-track',
      }),
    );

    render(<MusicPlayerStateHarness />);

    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
  });

  it('does not load audio on mount even when persisted state says playing', () => {
    const persisted = JSON.stringify({
      currentTrackIndex: 1,
      currentTime: 42,
      isPlaying: true,
    });
    window.sessionStorage.setItem('arsvine:music-player', persisted);

    render(<MusicPlayerStateHarness />);

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBeNull();
    expect(loadMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('current-track').textContent).toBe('Track Two');
    expect(screen.getByTestId('playing-state').textContent).toBe('false');
  });

  it('does not overwrite a persisted resume position before an audio source is loaded', () => {
    window.sessionStorage.setItem(
      'arsvine:music-player',
      JSON.stringify({
        currentTrackIndex: 1,
        currentTime: 42,
        trackId: 'track-two',
      }),
    );

    render(<MusicPlayerStateHarness />);

    expect(JSON.parse(window.sessionStorage.getItem('arsvine:music-player') ?? '{}')).toMatchObject(
      {
        currentTime: 42,
        trackId: 'track-two',
      },
    );
    expect((screen.getByTestId('audio') as HTMLAudioElement).getAttribute('src')).toBeNull();
  });

  it('ignores a stale play rejection after a newer track starts playing', async () => {
    let rejectFirstPlay: ((reason?: unknown) => void) | undefined;
    playMock
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirstPlay = reject;
          }),
      )
      .mockResolvedValue(undefined);
    render(<MusicPlayerStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'track-two' }));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    fireEvent.play(audio);
    expect(screen.getByTestId('playing-state').textContent).toBe('true');

    await act(async () => {
      rejectFirstPlay?.(new DOMException('superseded', 'AbortError'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('playing-state').textContent).toBe('true');
  });

  it('does not write storage on every timeupdate event', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<MusicPlayerStateHarness />);
    const writesAfterMount = setItem.mock.calls.length;
    const audio = screen.getByTestId('audio') as HTMLAudioElement;

    for (let second = 1; second <= 20; second += 1) {
      audio.currentTime = second / 4;
      fireEvent.timeUpdate(audio);
    }

    expect(setItem.mock.calls.length).toBeLessThanOrEqual(writesAfterMount + 2);
  });
});
