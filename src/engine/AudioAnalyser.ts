import * as Tone from 'tone';

export interface AudioData {
  frequency: Uint8Array;
  waveform: Uint8Array;
}

export class AudioAnalyser {
  private analyser: AnalyserNode;
  private freqData: Uint8Array;
  private waveData: Uint8Array;

  constructor() {
    const context = Tone.getContext().rawContext as AudioContext;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveData = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect Tone.js destination to analyser
    Tone.getDestination().connect(this.analyser);
  }

  getData(): AudioData {
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.waveData);
    return { frequency: this.freqData, waveform: this.waveData };
  }

  dispose(): void {
    this.analyser.disconnect();
  }
}
