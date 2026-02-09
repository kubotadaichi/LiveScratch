interface StatusBarProps {
  isPlaying: boolean;
  bpm: number;
  trackCount: number;
  position: string;
}

export function StatusBar({ isPlaying, bpm, trackCount, position }: StatusBarProps) {
  // Parse "bar:beat:sixteenth" → "Bar N | Beat M" (1-indexed for display)
  const parts = position.split(':');
  const bar = parseInt(parts[0], 10) + 1;
  const beat = parseInt(parts[1], 10) + 1;

  return (
    <div className="statusbar">
      <span className={`status-indicator ${isPlaying ? 'active' : ''}`}>
        {isPlaying ? '● Playing' : '○ Stopped'}
      </span>
      {isPlaying && (
        <span className="status-position">
          Bar {bar} : Beat {beat}
        </span>
      )}
      <span className="status-info">
        {bpm} BPM | {trackCount} track{trackCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
