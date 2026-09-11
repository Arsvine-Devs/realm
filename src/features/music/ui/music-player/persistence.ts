interface PersistedPlayerState {
  currentTrackIndex: number;
  currentTime: number;
  trackId?: string;
}

interface StorageLike {
  getItem(key: string): string | null;
}

function clampTrackIndex(trackIndex: unknown, playlistLength: number) {
  if (typeof trackIndex !== 'number' || Number.isNaN(trackIndex)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.max(playlistLength - 1, 0), trackIndex));
}

function clampCurrentTime(currentTime: unknown) {
  if (typeof currentTime !== 'number' || Number.isNaN(currentTime) || currentTime < 0) {
    return 0;
  }

  return currentTime;
}

export function parsePersistedPlayerState(raw: string | null, playlistLength: number) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      currentTrackIndex: clampTrackIndex(parsed?.currentTrackIndex, playlistLength),
      currentTime: clampCurrentTime(parsed?.currentTime),
      trackId: typeof parsed?.trackId === 'string' ? parsed.trackId : undefined,
    } satisfies PersistedPlayerState;
  } catch {
    return null;
  }
}

export function readPersistedPlayerStateFromStorage(
  primaryStorage: StorageLike | null | undefined,
  secondaryStorage: StorageLike | null | undefined,
  key: string,
  playlistLength: number,
) {
  const primary = parsePersistedPlayerState(primaryStorage?.getItem(key) ?? null, playlistLength);
  if (primary) {
    return primary;
  }

  return parsePersistedPlayerState(secondaryStorage?.getItem(key) ?? null, playlistLength);
}
