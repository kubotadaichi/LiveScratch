import * as Blockly from 'blockly';

export function registerPatternBlocks(): void {
  Blockly.Blocks['beat_pattern'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('beat')
        .appendField(new Blockly.FieldTextInput('x---x---'), 'STEPS');
      this.setOutput(true, 'Pattern');
      this.setColour(160);
      this.setTooltip('Beat pattern (x = hit, - = rest)');
    },
  };

  Blockly.Blocks['note_pattern'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('note')
        .appendField(new Blockly.FieldTextInput('C4'), 'PITCH');
      this.setOutput(true, 'Pattern');
      this.setColour(160);
      this.setTooltip('Single repeating note');
    },
  };

  Blockly.Blocks['sequence_pattern'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('sequence')
        .appendField(new Blockly.FieldTextInput('C3,E3,G3,C4'), 'PITCHES');
      this.setOutput(true, 'Pattern');
      this.setColour(160);
      this.setTooltip('Note sequence (comma-separated)');
    },
  };
}
