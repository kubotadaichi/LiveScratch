import { useState, useCallback, useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { BlocklyEditor } from '@/components/BlocklyEditor';
import { CodePanel } from '@/components/CodePanel';
import { StatusBar } from '@/components/StatusBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import type { LiveScratchIR, Track } from '@/engine/types';
import './App.css';

function App() {
  const { isPlaying, bpm, play, stop, setBPM, applyIR } = useAudioEngine();
  const [ir, setIR] = useState<LiveScratchIR>({ bpm: 120, tracks: [] });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showCodePanel, setShowCodePanel] = useState(false);

  const selectedTrack: Track | null =
    ir.tracks.find((t) => t.id === selectedBlockId) ?? null;

  const handleIRChange = useCallback(
    (newIR: LiveScratchIR) => {
      setIR(newIR);
      applyIR(newIR);
    },
    [applyIR]
  );

  const handleBPMChange = useCallback(
    (newBpm: number) => {
      setBPM(newBpm);
      setIR((prev) => ({ ...prev, bpm: newBpm }));
    },
    [setBPM]
  );

  const handleCustomCode = useCallback(
    (trackId: string, code: string) => {
      setIR((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, customCode: code } : t
        ),
      }));
    },
    []
  );

  // Space key to toggle play/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isPlaying) {
          stop();
        } else {
          play();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, stop]);

  return (
    <div className={`app ${showCodePanel ? '' : 'code-panel-hidden'}`}>
      <Toolbar
        isPlaying={isPlaying}
        bpm={bpm}
        onPlay={play}
        onStop={stop}
        onBPMChange={handleBPMChange}
        showCodePanel={showCodePanel}
        onToggleCodePanel={() => setShowCodePanel((v) => !v)}
      />
      <BlocklyEditor
        onIRChange={handleIRChange}
        onBlockSelect={setSelectedBlockId}
        resizeTrigger={showCodePanel}
      />
      {showCodePanel && (
        <CodePanel track={selectedTrack} onCustomCode={handleCustomCode} />
      )}
      <StatusBar
        isPlaying={isPlaying}
        bpm={bpm}
        trackCount={ir.tracks.length}
      />
    </div>
  );
}

export default App;
