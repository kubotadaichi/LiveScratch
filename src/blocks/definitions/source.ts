import * as Blockly from 'blockly';

export function registerSourceBlocks(): void {
  Blockly.Blocks['synth_source'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('synth')
        .appendField(new Blockly.FieldDropdown([
          ['sine', 'sine'],
          ['square', 'square'],
          ['sawtooth', 'sawtooth'],
          ['triangle', 'triangle'],
        ]), 'WAVEFORM');
      this.setOutput(true, 'Source');
      this.setColour(210);
      this.setTooltip('Synthesizer sound source');
    },
  };

  Blockly.Blocks['sampler_source'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('sample')
        .appendField(new Blockly.FieldDropdown([
          ['kick', 'kick'],
          ['snare', 'snare'],
          ['hihat', 'hihat'],
          ['clap', 'clap'],
        ]), 'SAMPLE');
      this.setOutput(true, 'Source');
      this.setColour(210);
      this.setTooltip('Sample-based sound source');
    },
  };
}
