import * as Blockly from 'blockly';
import type {
  LiveScratchIR,
  Track,
  Source,
  Pattern,
  Effect,
  VisualDefinition,
  VisualShape,
  VisualConfig,
  Modulation,
} from '@/engine/types';
import { isCustomBlock, getCustomBlockGenerator } from '@/blocks/customBlockRegistry';

function getSource(block: Blockly.Block): Source | null {
  const sourceBlock = block.getInputTargetBlock('SOURCE');
  if (!sourceBlock) return null;

  if (sourceBlock.type === 'synth_source') {
    return {
      type: 'synth',
      waveform: sourceBlock.getFieldValue('WAVEFORM'),
    };
  }
  if (sourceBlock.type === 'sampler_source') {
    return {
      type: 'sampler',
      sample: sourceBlock.getFieldValue('SAMPLE'),
    };
  }
  return null;
}

function getPattern(block: Blockly.Block): Pattern | null {
  const patternBlock = block.getInputTargetBlock('PATTERN');
  if (!patternBlock) return null;

  if (patternBlock.type === 'beat_pattern') {
    return { type: 'beat', steps: patternBlock.getFieldValue('STEPS') };
  }
  if (patternBlock.type === 'note_pattern') {
    return { type: 'note', pitch: patternBlock.getFieldValue('PITCH') };
  }
  if (patternBlock.type === 'sequence_pattern') {
    const pitchesStr = patternBlock.getFieldValue('PITCHES') as string;
    return { type: 'sequence', pitches: pitchesStr.split(',').map(s => s.trim()) };
  }
  return null;
}

function getEffects(block: Blockly.Block): Effect[] {
  const effects: Effect[] = [];
  let effectBlock = block.getInputTargetBlock('EFFECTS');

  while (effectBlock) {
    if (effectBlock.type === 'reverb_effect') {
      effects.push({
        type: 'reverb',
        decay: effectBlock.getFieldValue('DECAY'),
        wet: effectBlock.getFieldValue('WET'),
      });
    } else if (effectBlock.type === 'delay_effect') {
      effects.push({
        type: 'delay',
        time: effectBlock.getFieldValue('TIME'),
        feedback: effectBlock.getFieldValue('FEEDBACK'),
        wet: effectBlock.getFieldValue('WET'),
      });
    } else if (effectBlock.type === 'filter_effect') {
      effects.push({
        type: 'filter',
        frequency: effectBlock.getFieldValue('FREQUENCY'),
        filterType: effectBlock.getFieldValue('FILTER_TYPE'),
        wet: effectBlock.getFieldValue('WET'),
      });
    }
    effectBlock = effectBlock.getInputTargetBlock('NEXT_EFFECT');
  }

  return effects;
}

export function workspaceToIR(workspace: Blockly.Workspace): LiveScratchIR {
  let bpm = 120;
  const tracks: Track[] = [];

  const topBlocks = workspace.getTopBlocks(true);

  for (const topBlock of topBlocks) {
    if (topBlock.type === 'loop_block' && topBlock.isEnabled()) {
      let block = topBlock.getInputTargetBlock('TRACKS');
      while (block) {
        if (!block.isEnabled()) {
          block = block.getNextBlock();
          continue;
        }
        if (block.type === 'bpm_block') {
          bpm = block.getFieldValue('BPM');
        } else if (block.type === 'track_block') {
          const source = getSource(block);
          const pattern = getPattern(block);
          if (source && pattern) {
            tracks.push({
              id: block.id,
              source,
              pattern,
              effects: getEffects(block),
            });
          }
        } else if (isCustomBlock(block.type)) {
          const genCode = getCustomBlockGenerator(block.type);
          if (genCode) {
            try {
              const fields: Record<string, unknown> = {};
              block.inputList.forEach(input => {
                input.fieldRow.forEach(field => {
                  if (field.name) {
                    fields[field.name] = field.getValue();
                  }
                });
              });
              const generator = new Function('fields', 'blockId', genCode);
              const fragment = generator(fields, block.id);
              if (fragment?.type === 'track') {
                tracks.push(fragment);
              }
            } catch (e) {
              console.error(`Custom block generator error for ${block.type}:`, e);
            }
          }
        }
        block = block.getNextBlock();
      }
    }
  }

  return { bpm, tracks, visual: getVisualDefinition(workspace) };
}

function getModulations(block: Blockly.Block): Modulation[] {
  const mods: Modulation[] = [];
  let modBlock = block.getInputTargetBlock('MODULATIONS');
  while (modBlock) {
    if (modBlock.type === 'mod_freq') {
      mods.push({
        source: 'freq',
        property: modBlock.getFieldValue('PROPERTY'),
        scale: modBlock.getFieldValue('SCALE'),
        offset: 0,
        freqRange: [
          modBlock.getFieldValue('RANGE_LO'),
          modBlock.getFieldValue('RANGE_HI'),
        ],
      });
    } else if (modBlock.type === 'mod_waveform') {
      mods.push({
        source: 'waveform',
        property: modBlock.getFieldValue('PROPERTY'),
        scale: modBlock.getFieldValue('SCALE'),
        offset: 0,
      });
    } else if (modBlock.type === 'mod_beat') {
      mods.push({
        source: 'beat',
        property: modBlock.getFieldValue('PROPERTY'),
        scale: modBlock.getFieldValue('SCALE'),
        offset: 0,
      });
    } else if (modBlock.type === 'mod_time') {
      mods.push({
        source: 'time',
        property: modBlock.getFieldValue('PROPERTY'),
        scale: modBlock.getFieldValue('SCALE'),
        offset: 0,
      });
    }
    modBlock = modBlock.getInputTargetBlock('NEXT_MOD');
  }
  return mods;
}

function getVisualDefinition(
  workspace: Blockly.Workspace
): VisualDefinition | undefined {
  const topBlocks = workspace.getTopBlocks(true);
  for (const topBlock of topBlocks) {
    if (topBlock.type === 'canvas_config' && topBlock.isEnabled()) {
      const config: VisualConfig = {
        backgroundColor: topBlock.getFieldValue('BG_COLOR'),
        backgroundFade: topBlock.getFieldValue('FADE'),
      };
      const shapes: VisualShape[] = [];
      let block = topBlock.getInputTargetBlock('SHAPES');
      while (block) {
        if (!block.isEnabled()) {
          block = block.getNextBlock();
          continue;
        }
        if (block.type === 'visual_circle' || block.type === 'visual_rect') {
          shapes.push({
            id: block.id,
            type: block.type === 'visual_circle' ? 'circle' : 'rect',
            x: block.getFieldValue('X'),
            y: block.getFieldValue('Y'),
            size: block.getFieldValue('SIZE'),
            fillColor: block.getFieldValue('FILL'),
            strokeColor: block.getFieldValue('STROKE'),
            strokeWeight: block.getFieldValue('STROKE_WEIGHT'),
            modulations: getModulations(block),
          });
        } else if (block.type === 'visual_waveform') {
          shapes.push({
            id: block.id,
            type: 'waveform',
            x: 0,
            y: 0,
            size: 0,
            fillColor: '#000000',
            strokeColor: block.getFieldValue('COLOR'),
            strokeWeight: block.getFieldValue('STROKE_WEIGHT'),
            modulations: [],
          });
        } else if (block.type === 'visual_spectrum') {
          shapes.push({
            id: block.id,
            type: 'spectrum',
            x: 0,
            y: 0,
            size: 0,
            fillColor: '#000000',
            strokeColor: '#000000',
            strokeWeight: 0,
            modulations: [],
          });
        } else if (block.type === 'visual_shader') {
          shapes.push({
            id: block.id,
            type: 'shader',
            x: 0,
            y: 0,
            size: 0,
            fillColor: '#000000',
            strokeColor: '#000000',
            strokeWeight: 0,
            modulations: [],
            fragmentShader: block.getFieldValue('FRAG_CODE'),
          });
        }
        block = block.getNextBlock();
      }
      return { config, shapes };
    }
  }
  return undefined;
}
