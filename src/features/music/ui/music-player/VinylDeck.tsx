import styles from '../MusicPlayer.module.scss';

interface VinylDeckProps {
  dragOffsetX: number;
  incomingTrackOffsetX: number;
  isDragging: boolean;
  isFullPower: boolean;
  isPlaying: boolean;
  pauseTitle: string;
  onTogglePlay: () => void;
  onStartDrag: (clientX: number) => void;
  incomingTrackVisible: boolean;
  playTitle: string;
  setContainerRef: (element: HTMLDivElement | null) => void;
}

export default function VinylDeck({
  dragOffsetX,
  incomingTrackOffsetX,
  isDragging,
  isFullPower,
  isPlaying,
  pauseTitle,
  onTogglePlay,
  onStartDrag,
  incomingTrackVisible,
  playTitle,
  setContainerRef,
}: VinylDeckProps) {
  return (
    // The record surface is a pointer-only drag enhancement; keyboard users can choose tracks from the playlist.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the surface is a labelled drag group, not a standalone keyboard control.
    <div
      ref={setContainerRef}
      className={styles.vinylMechanismContainer}
      /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset would add form semantics to a visual playback surface. */
      role="group"
      aria-label={isPlaying ? pauseTitle : playTitle}
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        onStartDrag(event.clientX);
        event.preventDefault();
      }}
      onTouchStart={(event) => {
        if (event.touches.length !== 1) {
          return;
        }

        onStartDrag(event.touches[0].clientX);
      }}
    >
      <div className={styles.vinylPlatter}>
        <div
          className={`${styles.vinylRecord} ${isPlaying ? styles.recordSpinning : ''}`}
          style={{
            transform: `translateX(${dragOffsetX}px)`,
            transition: isDragging ? 'none' : undefined,
          }}
        >
          <div className={styles.vinylLabel} />
        </div>
        {incomingTrackVisible && (
          <div
            className={`${styles.vinylRecord} ${styles.incomingVinylRecord}`}
            style={{
              transform: `translateX(${incomingTrackOffsetX}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: 1,
            }}
          >
            <div className={styles.vinylLabel} />
          </div>
        )}
      </div>

      <div className={`${styles.tonearmAssembly} ${isPlaying ? styles.tonearmPlaying : ''}`}>
        <button
          type="button"
          className={styles.tonearmHitbox}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePlay();
          }}
          title={isPlaying ? pauseTitle : playTitle}
          aria-label={isPlaying ? pauseTitle : playTitle}
          aria-pressed={isPlaying}
        />
        <div
          className={`${styles.tonearm} ${!isFullPower ? styles.tonearmLowPower : ''}`}
          style={{
            boxShadow:
              isPlaying && isFullPower ? '0 0 5px rgba(var(--ark-primary-rgb), 0.3)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
