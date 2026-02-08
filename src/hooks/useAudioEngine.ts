import { useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '@/engine/AudioEngine';
import type { LiveScratchIR } from '@/engine/types';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(120);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const play = useCallback(async () => {
    await Tone.start();
    getEngine().start();
    setIsPlaying(true);
  }, [getEngine]);

  const stop = useCallback(() => {
    getEngine().stop();
    setIsPlaying(false);
  }, [getEngine]);

  const setBPM = useCallback(
    (newBpm: number) => {
      setBpmState(newBpm);
      getEngine().setBPM(newBpm);
    },
    [getEngine]
  );

  const applyIR = useCallback(
    (ir: LiveScratchIR) => {
      setBpmState(ir.bpm);
      getEngine().applyIR(ir);
    },
    [getEngine]
  );

  return { isPlaying, bpm, play, stop, setBPM, applyIR };
}
