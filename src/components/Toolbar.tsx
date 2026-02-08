import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

interface ToolbarProps {
  isPlaying: boolean;
  bpm: number;
  onPlay: () => void;
  onStop: () => void;
  onBPMChange: (bpm: number) => void;
  showCodePanel: boolean;
  onToggleCodePanel: () => void;
  // Project & Auth
  user: User | null;
  projectTitle: string;
  saving: boolean;
  onSave: () => void;
  onOpen: () => void;
  onShare: () => void;
  onAuth: () => void;
  onSignOut: () => void;
}

export function Toolbar({
  isPlaying,
  bpm,
  onPlay,
  onStop,
  onBPMChange,
  showCodePanel,
  onToggleCodePanel,
  user,
  projectTitle,
  saving,
  onSave,
  onOpen,
  onShare,
  onAuth,
  onSignOut,
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
        <span className="toolbar-project-title">{projectTitle}</span>
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
        {user ? (
          <>
            <button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onOpen}>Open</button>
            <button onClick={onShare}>Share</button>
            <button onClick={onToggleCodePanel}>
              {showCodePanel ? 'Hide Code' : 'Show Code'}
            </button>
            <button className="auth-avatar" onClick={onSignOut} title="Sign out">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                user.email?.charAt(0).toUpperCase()
              )}
            </button>
          </>
        ) : (
          <>
            <button onClick={onAuth}>Sign in</button>
            <button onClick={onToggleCodePanel}>
              {showCodePanel ? 'Hide Code' : 'Show Code'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
