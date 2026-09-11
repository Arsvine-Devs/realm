import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MusicTrack } from '@/features/music/contracts/musicTrack';
import { MUSIC_PLAYER_STORAGE_KEY } from './constants';
import { readPersistedPlayerStateFromStorage } from './persistence';
import { buildManagedAssetUrl } from '@/shared/lib/cdn';

interface UseMusicPlayerStateOptions {
  playlist: MusicTrack[];
}

const PERSIST_INTERVAL_MS = 1_000;

function getTrackSrc(track: MusicTrack) {
  if (track.src) return track.src;
  if (!track.objectKey) {
    throw new Error(`Music track "${track.id}" is missing both objectKey and src`);
  }
  return buildManagedAssetUrl(track.objectKey);
}

function getAudioPath(src: string) {
  return new URL(src, window.location.origin).pathname;
}

function syncAudioSource(audio: HTMLAudioElement, src: string) {
  const currentSrcPath = audio.src ? getAudioPath(audio.src) : null;
  if (currentSrcPath === getAudioPath(src)) return false;

  audio.src = src;
  audio.load();
  return true;
}

export function useMusicPlayerState({ playlist }: UseMusicPlayerStateOptions) {
  const initialPersistedState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return readPersistedPlayerStateFromStorage(
      window.sessionStorage,
      window.localStorage,
      MUSIC_PLAYER_STORAGE_KEY,
      playlist.length,
    );
  }, [playlist.length]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const desiredPlayingRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const resumeTimeRef = useRef<number | null>(initialPersistedState?.currentTime ?? null);
  const hasRestoredPersistedTrackRef = useRef(false);
  const playAttemptRef = useRef(0);
  const lastPersistedAtRef = useRef(0);
  const stateRef = useRef({ currentTrackIndex: 0, currentTime: 0, isPlaying: false });
  const [playRequest, setPlayRequest] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    initialPersistedState?.currentTrackIndex ?? 0,
  );
  const [currentTime, setCurrentTime] = useState(initialPersistedState?.currentTime ?? 0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!playlist.length || hasRestoredPersistedTrackRef.current) return;

    hasRestoredPersistedTrackRef.current = true;
    const persistedTrackIndex = initialPersistedState?.trackId
      ? playlist.findIndex((track) => track.id === initialPersistedState.trackId)
      : -1;

    setCurrentTrackIndex(
      persistedTrackIndex >= 0
        ? persistedTrackIndex
        : (initialPersistedState?.currentTrackIndex ?? 0),
    );
  }, [initialPersistedState?.currentTrackIndex, initialPersistedState?.trackId, playlist]);

  const resolvedTrackIndex = useMemo(() => {
    if (!playlist.length) return 0;
    return Math.max(0, Math.min(currentTrackIndex, playlist.length - 1));
  }, [currentTrackIndex, playlist.length]);

  useEffect(() => {
    stateRef.current = { currentTrackIndex: resolvedTrackIndex, currentTime, isPlaying };
  }, [currentTime, isPlaying, resolvedTrackIndex]);

  const persistPlayerState = useCallback(
    (force = false) => {
      if (typeof window === 'undefined') return;
      const now = Date.now();
      if (!force && now - lastPersistedAtRef.current < PERSIST_INTERVAL_MS) return;

      const snapshot = stateRef.current;
      const audio = audioRef.current;
      const hasLoadedSource = Boolean(audio?.currentSrc || audio?.getAttribute('src'));
      if (!playlist.length && !hasLoadedSource) return;
      const nextState = {
        currentTrackIndex: snapshot.currentTrackIndex,
        currentTime: hasLoadedSource
          ? (audio?.currentTime ?? snapshot.currentTime)
          : snapshot.currentTime,
        trackId: playlist[snapshot.currentTrackIndex]?.id ?? initialPersistedState?.trackId,
      };
      const serialized = JSON.stringify(nextState);
      window.sessionStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
      window.localStorage.setItem(MUSIC_PLAYER_STORAGE_KEY, serialized);
      lastPersistedAtRef.current = now;
    },
    [initialPersistedState?.trackId, playlist],
  );

  const requestPlayback = useCallback(() => {
    desiredPlayingRef.current = true;
    setPlayRequest((request) => request + 1);
  }, []);

  const syncPlayState = useCallback(
    (shouldPlay: boolean) => {
      hasUserInteractedRef.current = true;
      if (shouldPlay) {
        requestPlayback();
        return;
      }

      desiredPlayingRef.current = false;
      playAttemptRef.current += 1;
      audioRef.current?.pause();
      setIsPlaying(false);
      persistPlayerState(true);
    },
    [persistPlayerState, requestPlayback],
  );

  const handlePrev = useCallback(() => {
    if (!playlist.length) return;
    hasUserInteractedRef.current = true;
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    hasUserInteractedRef.current = true;
    resumeTimeRef.current = 0;
    setCurrentTrackIndex((previous) => (previous + 1) % playlist.length);
  }, [playlist.length]);

  const selectTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlist.length) return;
      hasUserInteractedRef.current = true;
      resumeTimeRef.current = 0;
      desiredPlayingRef.current = true;

      if (index !== resolvedTrackIndex) {
        setCurrentTrackIndex(index);
      }
      requestPlayback();
    },
    [playlist.length, requestPlayback, resolvedTrackIndex],
  );

  const handleAudioError = useCallback(() => {
    desiredPlayingRef.current = false;
    playAttemptRef.current += 1;
    setIsPlaying(false);
    persistPlayerState(true);
  }, [persistPlayerState]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const track = playlist[resolvedTrackIndex];
    if (!audio || !track || !hasUserInteractedRef.current) return;

    syncAudioSource(audio, getTrackSrc(track));
    if (!desiredPlayingRef.current) return;

    const attempt = ++playAttemptRef.current;
    const playPromise = audio.play();
    playPromise?.catch(() => {
      if (playAttemptRef.current !== attempt) return;
      desiredPlayingRef.current = false;
      setIsPlaying(false);
      persistPlayerState(true);
    });
  }, [persistPlayerState, playRequest, playlist, resolvedTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      persistPlayerState();
    };
    const setAudioData = () => {
      if (resumeTimeRef.current !== null) {
        audio.currentTime =
          audio.duration > 0
            ? Math.min(resumeTimeRef.current, audio.duration)
            : resumeTimeRef.current;
        resumeTimeRef.current = null;
      }
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(audio.currentTime);
    };
    const setAudioPlaying = () => {
      desiredPlayingRef.current = true;
      setIsPlaying(true);
      persistPlayerState(true);
    };
    const setAudioPaused = () => {
      setIsPlaying(false);
      persistPlayerState(true);
    };
    const handleEnded = () => {
      desiredPlayingRef.current = true;
      handleNext();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('play', setAudioPlaying);
    audio.addEventListener('pause', setAudioPaused);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('play', setAudioPlaying);
      audio.removeEventListener('pause', setAudioPaused);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleNext, persistPlayerState]);

  useEffect(() => {
    persistPlayerState(true);
  }, [isPlaying, persistPlayerState, resolvedTrackIndex]);

  useEffect(() => {
    const handlePageHide = () => persistPlayerState(true);
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [persistPlayerState]);

  const currentTrack = playlist[resolvedTrackIndex] ?? null;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shouldPreloadMetadata = isPlaying || currentTime > 0;

  return {
    audioRef,
    currentTrack,
    currentTrackIndex: resolvedTrackIndex,
    handleAudioError,
    handleNext,
    handlePrev,
    isPlaying,
    progressPercent,
    selectTrack,
    shouldPreloadMetadata,
    syncPlayState,
  };
}
