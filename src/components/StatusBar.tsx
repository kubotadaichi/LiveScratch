interface StatusBarProps {
  isPlaying: boolean;
  bpm: number;
  trackCount: number;
}

export function StatusBar({ isPlaying, bpm, trackCount }: StatusBarProps) {
  return (
    <div className="statusbar">
      <span className={`status-indicator ${isPlaying ? 'active' : ''}`}>
        {isPlaying ? '● Playing' : '○ Stopped'}
      </span>
      <span className="status-info">
        {bpm} BPM | {trackCount} track{trackCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
