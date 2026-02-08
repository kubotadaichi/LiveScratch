import { registerSourceBlocks } from './definitions/source';
import { registerPatternBlocks } from './definitions/pattern';
import { registerEffectBlocks } from './definitions/effect';
import { registerControlBlocks } from './definitions/control';
import { registerVisualBlocks } from './definitions/visual';

let registered = false;

export function registerAllBlocks(): void {
  if (registered) return;
  registerSourceBlocks();
  registerPatternBlocks();
  registerEffectBlocks();
  registerControlBlocks();
  registerVisualBlocks();
  registered = true;
}
