import type { MusicTrack } from '@/features/music/contracts/musicTrack';
import styles from '../MusicPlayer.module.scss';

interface PlaylistPanelProps {
  currentTrackIndex: number;
  isVisible: boolean;
  playlist: MusicTrack[];
  onSelectTrack: (index: number) => void;
}

export default function PlaylistPanel({
  currentTrackIndex,
  isVisible,
  playlist,
  onSelectTrack,
}: PlaylistPanelProps) {
  return (
    <div className={`${styles.playlistContainer} ${isVisible ? styles.visible : ''}`}>
      {playlist.map((track, index) => (
        <button
          type="button"
          key={track.id}
          className={`${styles.playlistItem} ${index === currentTrackIndex ? styles.activePlaylistItem : ''}`}
          onClick={() => onSelectTrack(index)}
          aria-current={index === currentTrackIndex ? 'true' : undefined}
        >
          <span className={styles.playlistItemTitle}>{track.title}</span>
          <span className={styles.playlistItemArtist}>{track.artist}</span>
        </button>
      ))}
    </div>
  );
}
