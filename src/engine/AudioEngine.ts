import * as Tone from 'tone';
import type { LiveScratchIR } from './types';
import { TrackManager } from './TrackManager';
import { diffIR } from '@/utils/diffIR';

export class AudioEngine {
  private tracks: Map<string, TrackManager> = new Map();
  private currentIR: LiveScratchIR | null = null;
  private isPlaying = false;

  async start(): Promise<void> {
    await Tone.start();
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
      this.tracks.set(track.id, new TrackManager(track));
    }

    for (const track of diff.updatedTracks) {
      const existing = this.tracks.get(track.id);
      if (existing) {
        existing.update(track);
      }
    }

    this.currentIR = ir;
  }

  dispose(): void {
    this.stop();
    this.tracks.forEach(t => t.dispose());
    this.tracks.clear();
    this.currentIR = null;
  }
}
