import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './MusicPlayer.module.scss';
import { defaultLocale, isLocale, type Locale } from '@/shared/contracts/locale';
import { useResponsive } from '@/shared/hooks/useMediaQuery';
import { useSafeTimeouts } from '../../../shared/hooks/useSafeTimeouts';
import { AUTO_COLLAPSE_DELAY } from './music-player/constants';
import PlayerControls from './music-player/PlayerControls';
import PlaylistPanel from './music-player/PlaylistPanel';
import { useMusicPlayerState } from './music-player/useMusicPlayerState';
import { useVinylDrag } from './music-player/useVinylDrag';
import VinylDeck from './music-player/VinylDeck';
import type { MusicTrack } from '@/features/music/contracts/musicTrack';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';

const commonLabelFallbacks: Record<
  Locale,
  Record<'expandPlaylist' | 'collapsePlaylist', string>
> = {
  'zh-CN': {
    expandPlaylist: '展开列表',
    collapsePlaylist: '收起列表',
  },
  'zh-TW': {
    expandPlaylist: '展開列表',
    collapsePlaylist: '收起列表',
  },
  en: {
    expandPlaylist: 'Open Playlist',
    collapsePlaylist: 'Close Playlist',
  },
};

const HANDLE_BAR_COUNT = 7;

const MusicPlayer = ({ powerLevel }: { powerLevel: number }) => {
  const { query } = useNavigationRuntime();
  const tCommon = useTranslations('common');
  const tMusicPlayer = useTranslations('musicPlayer');
  const { isMobile } = useResponsive();
  const safeTimers = useSafeTimeouts();
  const queryLocale = query.locale;
  const locale: Locale = isLocale(queryLocale) ? queryLocale : defaultLocale;

  const [isOpen, setIsOpen] = useState(false);
  const [isPlaylistVisible, setIsPlaylistVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [idleNudge, setIdleNudge] = useState(0);
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const handleBarTimerIdsRef = useRef<Set<number>>(new Set());

  const {
    audioRef,
    currentTrack,
    currentTrackIndex,
    handleAudioError,
    handleNext,
    handlePrev,
    isPlaying,
    progressPercent,
    selectTrack,
    shouldPreloadMetadata,
    syncPlayState,
  } = useMusicPlayerState({ playlist });

  const {
    dragOffsetX,
    incomingTrack,
    incomingTrackIndex,
    incomingTrackOffsetX,
    isDragging,
    setVinylContainer,
    startDrag,
  } = useVinylDrag({
    playlist,
    currentTrackIndex,
    onPrev: handlePrev,
    onNext: handleNext,
    safeTimers,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlaylist() {
      try {
        const response = await fetch('/api/assets/audio', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`audio api ${response.status}`);
        }
        const data = (await response.json()) as { items?: MusicTrack[] };
        setPlaylist(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.error('[music-player] failed to load audio catalog:', error);
        setPlaylist([]);
      }
    }

    loadPlaylist();

    return () => controller.abort();
  }, []);

  const bumpIdleTimer = useCallback(() => {
    setIdleNudge((value) => value + 1);
  }, []);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const timeoutId = safeTimers.setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => safeTimers.clearTimeout(timeoutId);
  }, [isMobile, safeTimers]);

  useEffect(() => {
    if (!isOpen || isHovering || isDragging || isPlaylistVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      setIsPlaylistVisible(false);
    }, AUTO_COLLAPSE_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [idleNudge, isDragging, isHovering, isOpen, isPlaylistVisible]);

  useEffect(() => {
    const handleElement = handleRef.current;
    if (!handleElement) {
      return;
    }

    const handleBarTimerIds = handleBarTimerIdsRef.current;
    const bars = handleElement.querySelectorAll(`.${styles.handleBar}`);
    const handleAnimationIteration = (event: Event) => {
      const bar = event.target as HTMLElement;
      bar.style.animationPlayState = 'paused';
      const randomDelay = Math.random() * 900 + 300;
      const timerId = safeTimers.setTimeout(() => {
        handleBarTimerIds.delete(timerId);
        bar.style.animationPlayState = 'running';
      }, randomDelay);
      handleBarTimerIds.add(timerId);
    };

    if (isPlaying) {
      bars.forEach((bar) => {
        (bar as HTMLElement).style.animationPlayState = 'running';
        bar.addEventListener('animationiteration', handleAnimationIteration);
      });
    } else {
      bars.forEach((bar) => {
        (bar as HTMLElement).style.animationPlayState = '';
      });
    }

    return () => {
      handleBarTimerIds.forEach((timerId) => safeTimers.clearTimeout(timerId));
      handleBarTimerIds.clear();
      bars.forEach((bar) => {
        bar.removeEventListener('animationiteration', handleAnimationIteration);
      });
    };
  }, [isPlaying, safeTimers]);

  const isFullPower = powerLevel === 100;
  const displayTitle = currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : '';
  const shouldMarqueeTitle = displayTitle.length > 28;
  const marqueeDuration = `${Math.max(12, displayTitle.length * 0.38)}s`;
  const resolveCommonLabel = (key: 'expandPlaylist' | 'collapsePlaylist') => {
    const translated = tCommon(key);
    return translated === key ? commonLabelFallbacks[locale][key] : translated;
  };
  const playlistToggleLabel = isPlaylistVisible
    ? resolveCommonLabel('collapsePlaylist')
    : resolveCommonLabel('expandPlaylist');

  return (
    <div
      className={`${styles.playerContainer} ${isOpen ? styles.open : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={bumpIdleTimer}
    >
      <div
        ref={handleRef}
        className={`${styles.handle} ${!isOpen && isPlaying ? styles.expanded : ''} ${isPlaying ? styles.playing : ''}`}
        onClick={() => {
          setIsOpen((value) => {
            if (value) {
              setIsPlaylistVisible(false);
            }
            return !value;
          });
        }}
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the handle contains block layout and is a composed HUD control. */
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={tMusicPlayer(isOpen ? 'closeTitle' : 'openTitle')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
        data-cursor-magnetic
      >
        <div className={styles.handleBarsContainer}>
          {[...Array(HANDLE_BAR_COUNT)].map((_, index) => (
            <div key={index} className={styles.handleBar} />
          ))}
        </div>
        {!isOpen && isPlaying && currentTrack && (
          <div className={styles.handleTrackInfo}>
            <div className={styles.handleTrackTitle}>{currentTrack.title}</div>
          </div>
        )}
      </div>

      {/* Music playback is non-verbal audio; captions are not applicable to this control. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- this element plays instrumental music and has no spoken track. */}
      <audio
        ref={audioRef}
        preload={shouldPreloadMetadata ? 'metadata' : 'none'}
        onError={handleAudioError}
      />

      <VinylDeck
        dragOffsetX={dragOffsetX}
        incomingTrackOffsetX={incomingTrackOffsetX}
        incomingTrackVisible={incomingTrackIndex !== -1 && !!incomingTrack}
        isDragging={isDragging}
        isFullPower={isFullPower}
        isPlaying={isPlaying}
        pauseTitle={tMusicPlayer('pauseTitle')}
        onTogglePlay={() => syncPlayState(!isPlaying)}
        onStartDrag={startDrag}
        playTitle={tMusicPlayer('playTitle')}
        setContainerRef={setVinylContainer}
      />

      <PlayerControls
        displayTitle={displayTitle}
        isFullPower={isFullPower}
        isPlaylistVisible={isPlaylistVisible}
        playlistToggleLabel={playlistToggleLabel}
        progressPercent={progressPercent}
        shouldMarqueeTitle={shouldMarqueeTitle}
        marqueeDuration={marqueeDuration}
        onTogglePlaylist={() => {
          setIsPlaylistVisible((value) => !value);
        }}
      />

      <PlaylistPanel
        currentTrackIndex={currentTrackIndex}
        isVisible={isPlaylistVisible}
        playlist={playlist}
        onSelectTrack={selectTrack}
      />
    </div>
  );
};

export default MusicPlayer;
