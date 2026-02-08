import * as Tone from 'tone';
import type { Effect } from './types';

export class EffectChain {
  private nodes: Tone.ToneAudioNode[] = [];

  constructor(effects: Effect[]) {
    this.nodes = effects.map(e => this.createNode(e));
  }

  private createNode(effect: Effect): Tone.ToneAudioNode {
    switch (effect.type) {
      case 'reverb': {
        const rev = new Tone.Reverb({ decay: effect.decay });
        rev.wet.value = effect.wet;
        return rev;
      }
      case 'delay': {
        const del = new Tone.FeedbackDelay(effect.time, effect.feedback);
        del.wet.value = effect.wet;
        return del;
      }
      case 'filter': {
        const filt = new Tone.Filter(effect.frequency, effect.filterType);
        return filt;
      }
    }
  }

  getNodes(): Tone.ToneAudioNode[] {
    return this.nodes;
  }

  dispose(): void {
    this.nodes.forEach(n => n.dispose());
    this.nodes = [];
  }
}
