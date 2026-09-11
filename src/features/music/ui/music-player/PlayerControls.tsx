import type { CSSProperties } from 'react';
import styles from '../MusicPlayer.module.scss';

interface PlayerControlsProps {
  displayTitle: string;
  isFullPower: boolean;
  isPlaylistVisible: boolean;
  playlistToggleLabel: string;
  progressPercent: number;
  shouldMarqueeTitle: boolean;
  marqueeDuration: string;
  onTogglePlaylist: () => void;
}

export default function PlayerControls({
  displayTitle,
  isFullPower,
  isPlaylistVisible,
  playlistToggleLabel,
  progressPercent,
  shouldMarqueeTitle,
  marqueeDuration,
  onTogglePlaylist,
}: PlayerControlsProps) {
  return (
    <div className={styles.playerContent}>
      <div className={styles.trackInfoContainer}>
        <div className={styles.trackInfo}>
          <div
            className={`${styles.trackTitle} ${shouldMarqueeTitle ? styles.trackTitleMarquee : ''}`}
            style={
              shouldMarqueeTitle
                ? ({ '--track-marquee-duration': marqueeDuration } as CSSProperties)
                : undefined
            }
          >
            {shouldMarqueeTitle ? (
              <div className={styles.trackTitleMarqueeInner}>
                <span>{displayTitle}</span>
                <span aria-hidden="true">{displayTitle}</span>
              </div>
            ) : (
              displayTitle
            )}
          </div>
        </div>
        <button
          className={`${styles.playlistToggleButton} ${!isFullPower ? styles.toggleButtonLowPower : ''}`}
          onClick={onTogglePlaylist}
          aria-label={playlistToggleLabel}
          data-cursor-label={playlistToggleLabel}
        >
          {[...Array(3)].map((_, index) => (
            <span key={index} className={styles.toggleButtonLine} />
          ))}
        </button>
      </div>
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
        />
      </div>
    </div>
  );
}
