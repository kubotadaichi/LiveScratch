import * as Tone from 'tone';
import type { Track, Source, Pattern } from './types';
import { EffectChain } from './EffectChain';

export class TrackManager {
  private source: Tone.ToneAudioNode | null = null;
  private sequence: Tone.Sequence | null = null;
  private effectChain: EffectChain | null = null;
  private trackId: string;
  private _customCodeApplied: boolean = false;

  constructor(track: Track) {
    this.trackId = track.id;
    this.build(track);
  }

  setCustomCodeApplied(value: boolean) {
    this._customCodeApplied = value;
  }

  get customCodeApplied(): boolean {
    return this._customCodeApplied;
  }

  private build(track: Track): void {
    // Create source
    this.source = this.createSource(track.source);

    // Create effect chain
    this.effectChain = new EffectChain(track.effects);
    const nodes = this.effectChain.getNodes();

    // Chain: source -> effects -> destination
    if (nodes.length > 0) {
      (this.source as any).chain(...nodes, Tone.getDestination());
    } else {
      (this.source as any).toDestination();
    }

    // Create sequence/pattern
    this.sequence = this.createPattern(track.pattern, this.source, track.source);
  }

  private createSource(source: Source): Tone.ToneAudioNode {
    if (source.type === 'synth') {
      return new Tone.Synth({ oscillator: { type: source.waveform } });
    }
    // sampler - use synthesis
    switch (source.sample) {
      case 'kick':
        return new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 } });
      case 'snare':
        return new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
      case 'hihat':
        return new Tone.MetalSynth({ frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 });
      case 'clap':
        return new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } });
      default:
        return new Tone.MembraneSynth();
    }
  }

  private createPattern(pattern: Pattern, source: Tone.ToneAudioNode, sourceType: Source): Tone.Sequence {
    switch (pattern.type) {
      case 'beat': {
        const steps = pattern.steps.split('').map(c => c === 'x' ? 1 : null);
        return new Tone.Sequence((time, value) => {
          if (value !== null) {
            this.triggerSource(source, sourceType, time);
          }
        }, steps, '8n').start(0);
      }
      case 'note': {
        // Repeat single note every quarter note
        return new Tone.Sequence((time, pitch) => {
          if (pitch) {
            this.triggerSource(source, sourceType, time, pitch);
          }
        }, [pattern.pitch], '4n').start(0);
      }
      case 'sequence': {
        return new Tone.Sequence((time, pitch) => {
          if (pitch) {
            this.triggerSource(source, sourceType, time, pitch);
          }
        }, pattern.pitches, '4n').start(0);
      }
    }
  }

  private triggerSource(source: Tone.ToneAudioNode, sourceType: Source, time: number, pitch?: string): void {
    if (source instanceof Tone.NoiseSynth) {
      source.triggerAttackRelease('8n', time);
    } else if (source instanceof Tone.MetalSynth) {
      source.triggerAttackRelease('32n', time);
    } else if (source instanceof Tone.MembraneSynth) {
      source.triggerAttackRelease(pitch || 'C1', '8n', time);
    } else if (source instanceof Tone.Synth) {
      source.triggerAttackRelease(pitch || 'C4', '8n', time);
    }
  }

  get id(): string {
    return this.trackId;
  }

  update(track: Track): void {
    this.dispose();
    this.build(track);
    this.setCustomCodeApplied(false);
  }

  applyCustomCode(code: string): void {
    this.dispose();

    try {
      // Execute custom code in a function scope with Tone and the track object available
      const customFunction = new Function('Tone', 'track', code);
      customFunction(Tone, this); // 'this' refers to the TrackManager instance
      this.setCustomCodeApplied(true);
      console.log(`Custom code applied to track ${this.id}`);
    } catch (error) {
      console.error(`Error applying custom code to track ${this.id}:`, error);
      // Potentially revert or at least leave the track in a silent, stable state
    }
  }

  dispose(): void {
    this.sequence?.stop();
    this.sequence?.dispose();
    this.sequence = null;
    this.effectChain?.dispose();
    this.effectChain = null;
    if (this.source) {
      (this.source as any).disconnect?.();
      this.source.dispose();
      this.source = null;
    }
  }
}
