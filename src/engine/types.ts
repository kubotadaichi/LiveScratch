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

// === Visual Types ===

export type ShapeType = 'circle' | 'rect' | 'waveform' | 'spectrum';
export type ModulationSource = 'freq' | 'waveform' | 'beat' | 'time';

export interface Modulation {
  source: ModulationSource;
  property: string;       // e.g. 'size', 'hue', 'x', 'y'
  scale: number;
  offset: number;
  freqRange?: [number, number]; // for 'freq' source: bin range
}

export interface VisualShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  fillColor: string;
  strokeColor: string;
  strokeWeight: number;
  modulations: Modulation[];
  customCode?: string;
}

export interface VisualConfig {
  backgroundColor: string;
  backgroundFade: number;  // 0-1, 0=full clear, 1=no clear (trail)
}

export interface VisualDefinition {
  config: VisualConfig;
  shapes: VisualShape[];
}

export interface LiveScratchIR {
  bpm: number;
  tracks: Track[];
  visual?: VisualDefinition;
}
