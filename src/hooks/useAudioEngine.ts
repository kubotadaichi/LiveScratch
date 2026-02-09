import { useRef, useCallback, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '@/engine/AudioEngine';
import type { LiveScratchIR } from '@/engine/types';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(120);
  const [position, setPosition] = useState('0:0:0');

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
    setPosition('0:0:0');
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

  const getAudioData = useCallback(() => {
    return engineRef.current?.getAudioData() ?? null;
  }, []);

  // Poll transport position during playback
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const poll = () => {
      if (engineRef.current) {
        setPosition(engineRef.current.getPosition());
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return { isPlaying, bpm, position, play, stop, setBPM, applyIR, getAudioData };
}
