import { useCallback, useState, useRef, useEffect } from 'react';
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
  onTitleChange: (title: string) => void;
  saving: boolean;
  onSave: () => void;
  onOpen: () => void;
  onShare: () => void;
  onAuth: () => void;
  onSignOut: () => void;
  visualBgMode?: boolean;
  onToggleVisualBg?: () => void;
  isMobile?: boolean;
  onCustomBlocks?: () => void;
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
  onTitleChange,
  saving,
  onSave,
  onOpen,
  onShare,
  onAuth,
  onSignOut,
  visualBgMode: _visualBgMode,
  onToggleVisualBg: _onToggleVisualBg,
  isMobile,
  onCustomBlocks,
}: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitTitle = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim() || 'Untitled';
    setDraft(trimmed);
    onTitleChange(trimmed);
  }, [draft, onTitleChange]);

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
        {editing ? (
          <input
            ref={inputRef}
            className="toolbar-project-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setDraft(projectTitle);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="toolbar-project-title"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {projectTitle}
          </span>
        )}
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
        {/* TODO: Visual bg mode needs browser debugging — disabled for now */}
      </div>
      <div className="toolbar-right">
        {user ? (
          <>
            <button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {!isMobile && <button onClick={onOpen}>Open</button>}
            {!isMobile && <button onClick={onShare}>Share</button>}
            <button onClick={onCustomBlocks}>Blocks</button>
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
