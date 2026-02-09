import * as Blockly from 'blockly';

let trackCounter = 0;

export function registerControlBlocks(): void {
  Blockly.Blocks['loop_block'] = {
    init(this: Blockly.Block) {
      this.appendStatementInput('TRACKS')
        .appendField('loop');
      this.setColour(290);
      this.setTooltip('Loop container for tracks');
    },
  };

  Blockly.Blocks['track_block'] = {
    init(this: Blockly.Block) {
      trackCounter++;
      const label = `Track ${trackCounter}`;
      this.appendValueInput('SOURCE')
        .setCheck('Source')
        .appendField('track')
        .appendField(new Blockly.FieldLabel(label), 'TRACK_LABEL');
      this.appendValueInput('PATTERN')
        .setCheck('Pattern')
        .appendField('pattern');
      this.appendValueInput('EFFECTS')
        .setCheck('Effect')
        .appendField('effects');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Audio track');
    },
  };

  Blockly.Blocks['bpm_block'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('BPM')
        .appendField(new Blockly.FieldNumber(120, 40, 300, 1), 'BPM');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Set tempo in BPM');
    },
  };
}
