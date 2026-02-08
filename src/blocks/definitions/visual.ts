import * as Blockly from 'blockly';
import { FieldColour } from '@blockly/field-colour';

export function registerVisualBlocks(): void {
  // Canvas config block
  Blockly.Blocks['canvas_config'] = {
    init(this: Blockly.Block) {
      this.appendStatementInput('SHAPES').appendField('canvas');
      this.appendDummyInput()
        .appendField('bg')
        .appendField(new FieldColour('#000000'), 'BG_COLOR')
        .appendField('fade')
        .appendField(new Blockly.FieldNumber(0, 0, 1, 0.05), 'FADE');
      this.setColour(30);
      this.setTooltip('Visual canvas configuration');
    },
  };

  // Shape: circle
  Blockly.Blocks['visual_circle'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('circle')
        .appendField('x%')
        .appendField(new Blockly.FieldNumber(50, 0, 100, 1), 'X')
        .appendField('y%')
        .appendField(new Blockly.FieldNumber(50, 0, 100, 1), 'Y')
        .appendField('size')
        .appendField(new Blockly.FieldNumber(100, 1, 1000, 1), 'SIZE');
      this.appendDummyInput()
        .appendField('fill')
        .appendField(new FieldColour('#ff00ff'), 'FILL')
        .appendField('stroke')
        .appendField(new FieldColour('#ffffff'), 'STROKE')
        .appendField('weight')
        .appendField(new Blockly.FieldNumber(0, 0, 20, 1), 'STROKE_WEIGHT');
      this.appendValueInput('MODULATIONS')
        .setCheck('Modulation')
        .appendField('react to');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Draw a circle');
    },
  };

  // Shape: rect
  Blockly.Blocks['visual_rect'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('rect')
        .appendField('x%')
        .appendField(new Blockly.FieldNumber(50, 0, 100, 1), 'X')
        .appendField('y%')
        .appendField(new Blockly.FieldNumber(50, 0, 100, 1), 'Y')
        .appendField('size')
        .appendField(new Blockly.FieldNumber(100, 1, 1000, 1), 'SIZE');
      this.appendDummyInput()
        .appendField('fill')
        .appendField(new FieldColour('#00ffff'), 'FILL')
        .appendField('stroke')
        .appendField(new FieldColour('#ffffff'), 'STROKE')
        .appendField('weight')
        .appendField(new Blockly.FieldNumber(0, 0, 20, 1), 'STROKE_WEIGHT');
      this.appendValueInput('MODULATIONS')
        .setCheck('Modulation')
        .appendField('react to');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Draw a rectangle');
    },
  };

  // Shape: waveform display
  Blockly.Blocks['visual_waveform'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('waveform')
        .appendField('color')
        .appendField(new FieldColour('#00ff00'), 'COLOR')
        .appendField('weight')
        .appendField(new Blockly.FieldNumber(2, 1, 10, 1), 'STROKE_WEIGHT');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Display audio waveform');
    },
  };

  // Shape: spectrum display
  Blockly.Blocks['visual_spectrum'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField('spectrum');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Display frequency spectrum');
    },
  };

  // Modulation: by frequency
  Blockly.Blocks['mod_freq'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_MOD')
        .setCheck('Modulation')
        .appendField('freq →')
        .appendField(
          new Blockly.FieldDropdown([
            ['size', 'size'],
            ['x', 'x'],
            ['y', 'y'],
            ['hue', 'hue'],
          ]),
          'PROPERTY'
        )
        .appendField('scale')
        .appendField(new Blockly.FieldNumber(100, -500, 500, 10), 'SCALE')
        .appendField('range')
        .appendField(new Blockly.FieldNumber(0, 0, 128, 1), 'RANGE_LO')
        .appendField('-')
        .appendField(new Blockly.FieldNumber(10, 0, 128, 1), 'RANGE_HI');
      this.setOutput(true, 'Modulation');
      this.setColour(40);
      this.setTooltip('Modulate by frequency band');
    },
  };

  // Modulation: by waveform amplitude
  Blockly.Blocks['mod_waveform'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_MOD')
        .setCheck('Modulation')
        .appendField('amplitude →')
        .appendField(
          new Blockly.FieldDropdown([
            ['size', 'size'],
            ['x', 'x'],
            ['y', 'y'],
            ['hue', 'hue'],
          ]),
          'PROPERTY'
        )
        .appendField('scale')
        .appendField(new Blockly.FieldNumber(100, -500, 500, 10), 'SCALE');
      this.setOutput(true, 'Modulation');
      this.setColour(40);
      this.setTooltip('Modulate by audio amplitude');
    },
  };

  // Modulation: by beat (low freq energy)
  Blockly.Blocks['mod_beat'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_MOD')
        .setCheck('Modulation')
        .appendField('beat →')
        .appendField(
          new Blockly.FieldDropdown([
            ['size', 'size'],
            ['x', 'x'],
            ['y', 'y'],
            ['hue', 'hue'],
          ]),
          'PROPERTY'
        )
        .appendField('scale')
        .appendField(new Blockly.FieldNumber(100, -500, 500, 10), 'SCALE');
      this.setOutput(true, 'Modulation');
      this.setColour(40);
      this.setTooltip('Modulate by beat energy');
    },
  };

  // Modulation: by time
  Blockly.Blocks['mod_time'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_MOD')
        .setCheck('Modulation')
        .appendField('time →')
        .appendField(
          new Blockly.FieldDropdown([
            ['hue', 'hue'],
            ['x', 'x'],
            ['y', 'y'],
            ['size', 'size'],
          ]),
          'PROPERTY'
        )
        .appendField('scale')
        .appendField(new Blockly.FieldNumber(360, -500, 500, 10), 'SCALE');
      this.setOutput(true, 'Modulation');
      this.setColour(40);
      this.setTooltip('Modulate by time (cyclic)');
    },
  };
}
