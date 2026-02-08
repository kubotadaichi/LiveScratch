import * as Blockly from 'blockly';

export function registerEffectBlocks(): void {
  Blockly.Blocks['reverb_effect'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_EFFECT')
        .setCheck('Effect')
        .appendField('reverb')
        .appendField('decay')
        .appendField(new Blockly.FieldNumber(1.5, 0.1, 10, 0.1), 'DECAY')
        .appendField('wet')
        .appendField(new Blockly.FieldNumber(0.5, 0, 1, 0.1), 'WET');
      this.setOutput(true, 'Effect');
      this.setColour(120);
      this.setTooltip('Reverb effect');
    },
  };

  Blockly.Blocks['delay_effect'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_EFFECT')
        .setCheck('Effect')
        .appendField('delay')
        .appendField('time')
        .appendField(new Blockly.FieldDropdown([
          ['8n', '8n'],
          ['4n', '4n'],
          ['16n', '16n'],
        ]), 'TIME')
        .appendField('feedback')
        .appendField(new Blockly.FieldNumber(0.3, 0, 0.9, 0.1), 'FEEDBACK')
        .appendField('wet')
        .appendField(new Blockly.FieldNumber(0.5, 0, 1, 0.1), 'WET');
      this.setOutput(true, 'Effect');
      this.setColour(120);
      this.setTooltip('Delay effect');
    },
  };

  Blockly.Blocks['filter_effect'] = {
    init(this: Blockly.Block) {
      this.appendValueInput('NEXT_EFFECT')
        .setCheck('Effect')
        .appendField('filter')
        .appendField(new Blockly.FieldDropdown([
          ['lowpass', 'lowpass'],
          ['highpass', 'highpass'],
          ['bandpass', 'bandpass'],
        ]), 'FILTER_TYPE')
        .appendField('freq')
        .appendField(new Blockly.FieldNumber(1000, 20, 20000, 10), 'FREQUENCY')
        .appendField('wet')
        .appendField(new Blockly.FieldNumber(1, 0, 1, 0.1), 'WET');
      this.setOutput(true, 'Effect');
      this.setColour(120);
      this.setTooltip('Filter effect');
    },
  };
}
