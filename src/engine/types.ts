export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type SampleName = 'kick' | 'snare' | 'hihat' | 'clap';

export interface SynthSource {
  type: 'synth';
  waveform: Waveform;
}

export interface SamplerSource {
  type: 'sampler';
  sample: SampleName;
}

export type Source = SynthSource | SamplerSource;

export interface BeatPattern {
  type: 'beat';
  steps: string; // e.g. "x---x---x---x---"
}

export interface NotePattern {
  type: 'note';
  pitch: string; // e.g. "C4"
}

export interface SequencePattern {
  type: 'sequence';
  pitches: string[]; // e.g. ["C3", "E3", "G3"]
}

export type Pattern = BeatPattern | NotePattern | SequencePattern;

export interface ReverbEffect {
  type: 'reverb';
  decay: number;
  wet: number;
}

export interface DelayEffect {
  type: 'delay';
  time: string; // e.g. "8n"
  feedback: number;
  wet: number;
}

export interface FilterEffect {
  type: 'filter';
  frequency: number;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  wet: number;
}

export type Effect = ReverbEffect | DelayEffect | FilterEffect;

export interface Track {
  id: string;
  source: Source;
  pattern: Pattern;
  effects: Effect[];
  customCode?: string;
}

export interface LiveScratchIR {
  bpm: number;
  tracks: Track[];
}
