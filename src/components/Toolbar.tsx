import { useCallback } from 'react';

interface ToolbarProps {
  isPlaying: boolean;
  bpm: number;
  onPlay: () => void;
  onStop: () => void;
  onBPMChange: (bpm: number) => void;
  showCodePanel: boolean;
  onToggleCodePanel: () => void;
}

export function Toolbar({
  isPlaying,
  bpm,
  onPlay,
  onStop,
  onBPMChange,
  showCodePanel,
  onToggleCodePanel,
}: ToolbarProps) {
  const handleBPMChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 40 && val <= 300) onBPMChange(val);
    },
    [onBPMChange]
  );

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">Live Scratch</span>
      </div>
      <div className="toolbar-center">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>
        <label className="bpm-control">
          BPM
          <input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={handleBPMChange}
          />
        </label>
      </div>
      <div className="toolbar-right">
        <button onClick={onToggleCodePanel}>
          {showCodePanel ? 'Hide Code' : 'Show Code'}
        </button>
      </div>
    </div>
  );
}
