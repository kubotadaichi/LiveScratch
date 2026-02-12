import * as Tone from 'tone';
import type { LiveScratchIR } from './types';
import { TrackManager } from './TrackManager';
import { diffIR } from '@/utils/diffIR';
import { AudioAnalyser, type AudioData } from './AudioAnalyser';

export class AudioEngine {
  private tracks: Map<string, TrackManager> = new Map();
  private currentIR: LiveScratchIR | null = null;
  private isPlaying = false;
  private analyser: AudioAnalyser | null = null;

  async start(): Promise<void> {
    await Tone.start();
    if (!this.analyser) {
      this.analyser = new AudioAnalyser();
    }
    Tone.getTransport().start();
    this.isPlaying = true;
  }

  stop(): void {
    Tone.getTransport().stop();
    this.isPlaying = false;
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  getBPM(): number {
    return Tone.getTransport().bpm.value;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  applyIR(ir: LiveScratchIR): void {
    const diff = diffIR(this.currentIR, ir);

    if (diff.bpmChanged) {
      this.setBPM(ir.bpm);
    }

    // Remove tracks immediately (silence deleted sounds right away)
    for (const id of diff.removedTrackIds) {
      this.tracks.get(id)?.dispose();
      this.tracks.delete(id);
    }

    // Add and update tracks immediately for responsive live coding
    for (const track of diff.addedTracks) {
      const tm = new TrackManager(track);
      if (track.customCode) {
        tm.applyCustomCode(track.customCode);
      }
      this.tracks.set(track.id, tm);
    }

    for (const track of diff.updatedTracks) {
      const existing = this.tracks.get(track.id);
      if (existing) {
        if (track.customCode) {
          existing.applyCustomCode(track.customCode);
        } else {
          existing.update(track);
        }
      }
    }

    this.currentIR = ir;
  }

  applyCustomCode(trackId: string, code: string): void {
    const trackManager = this.tracks.get(trackId);
    if (trackManager) {
      trackManager.applyCustomCode(code);
      // Update the IR to persist the custom code
      if (this.currentIR) {
        const track = this.currentIR.tracks.find(t => t.id === trackId);
        if (track) {
          track.customCode = code;
        }
      }
    }
  }

  getTracksCustomCodeStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.tracks.forEach((track, id) => {
      status[id] = track.customCodeApplied;
    });
    return status;
  }

  getPosition(): string {
    return Tone.getTransport().position as string;
  }

  getAudioData(): AudioData | null {
    return this.analyser?.getData() ?? null;
  }

  dispose(): void {
    this.stop();
    this.analyser?.dispose();
    this.analyser = null;
    this.tracks.forEach(t => t.dispose());
    this.tracks.clear();
    this.currentIR = null;
  }
}
