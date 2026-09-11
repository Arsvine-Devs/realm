import { useCallback, useEffect, useState } from 'react';
import type { MusicTrack } from '@/features/music/contracts/musicTrack';
import { DRAG_THRESHOLD } from './constants';

interface UseVinylDragOptions {
  playlist: MusicTrack[];
  currentTrackIndex: number;
  isDraggingDisabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
  safeTimers: {
    setTimeout: (fn: () => void, delay?: number) => number;
  };
}

export function useVinylDrag({
  playlist,
  currentTrackIndex,
  isDraggingDisabled = false,
  onPrev,
  onNext,
  safeTimers,
}: UseVinylDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [incomingTrackIndex, setIncomingTrackIndex] = useState(-1);
  const [incomingTrackOffsetX, setIncomingTrackOffsetX] = useState(0);
  const [vinylContainer, setVinylContainer] = useState<HTMLDivElement | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState(0);

  const hasTracks = playlist.length > 0;
  const nextTrackIndex = hasTracks ? (currentTrackIndex + 1) % playlist.length : -1;
  const prevTrackIndex = hasTracks
    ? (currentTrackIndex - 1 + playlist.length) % playlist.length
    : -1;
  const incomingTrack = incomingTrackIndex === -1 ? null : (playlist[incomingTrackIndex] ?? null);

  const startDrag = useCallback(
    (clientX: number) => {
      if (isDraggingDisabled || playlist.length <= 1) {
        return;
      }

      setIsDragging(true);
      setDragStartX(clientX);
      setDragCurrentX(clientX);
    },
    [isDraggingDisabled, playlist.length],
  );

  const moveDrag = useCallback(
    (clientX: number) => {
      if (!isDragging) {
        return;
      }

      setDragCurrentX(clientX);
      const offsetX = clientX - dragStartX;
      setDragOffsetX(offsetX);

      if (offsetX > DRAG_THRESHOLD / 2) {
        setIncomingTrackIndex(prevTrackIndex);
        setIncomingTrackOffsetX(offsetX - (vinylContainer?.offsetWidth || 200));
        return;
      }

      if (offsetX < -DRAG_THRESHOLD / 2) {
        setIncomingTrackIndex(nextTrackIndex);
        setIncomingTrackOffsetX(offsetX + (vinylContainer?.offsetWidth || 200));
        return;
      }

      setIncomingTrackIndex(-1);
      setIncomingTrackOffsetX(0);
    },
    [dragStartX, isDragging, nextTrackIndex, prevTrackIndex, vinylContainer],
  );

  const finishDrag = useCallback(() => {
    if (!isDragging) {
      return;
    }

    const finalOffsetX = dragCurrentX - dragStartX;
    setIsDragging(false);

    if (Math.abs(finalOffsetX) > DRAG_THRESHOLD) {
      if (finalOffsetX > 0) {
        onPrev();
        setDragOffsetX(vinylContainer?.offsetWidth || 200);
      } else {
        onNext();
        setDragOffsetX(-(vinylContainer?.offsetWidth || 200));
      }

      setIncomingTrackOffsetX(0);
      safeTimers.setTimeout(() => {
        setDragOffsetX(0);
        setIncomingTrackIndex(-1);
      }, 300);
    } else {
      setDragOffsetX(0);
      setIncomingTrackIndex(-1);
    }

    setDragStartX(0);
  }, [dragCurrentX, dragStartX, isDragging, onNext, onPrev, safeTimers, vinylContainer]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => moveDrag(event.clientX);
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      moveDrag(event.touches[0].clientX);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', finishDrag);
    window.addEventListener('touchcancel', finishDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', finishDrag);
      window.removeEventListener('touchcancel', finishDrag);
    };
  }, [finishDrag, isDragging, moveDrag]);

  return {
    dragOffsetX,
    incomingTrack,
    incomingTrackIndex,
    incomingTrackOffsetX,
    isDragging,
    setVinylContainer,
    startDrag,
  };
}
