import { registerSourceBlocks } from './definitions/source';
import { registerPatternBlocks } from './definitions/pattern';
import { registerEffectBlocks } from './definitions/effect';
import { registerControlBlocks } from './definitions/control';

let registered = false;

export function registerAllBlocks(): void {
  if (registered) return;
  registerSourceBlocks();
  registerPatternBlocks();
  registerEffectBlocks();
  registerControlBlocks();
  registered = true;
}
