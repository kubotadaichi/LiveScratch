import * as Blockly from 'blockly';

interface RegisteredCustomBlock {
  name: string;
  blockType: string;
  definition: Record<string, unknown>;
  generatorCode: string;
}

const registeredCustomBlocks = new Map<string, RegisteredCustomBlock>();

export function registerCustomBlock(
  id: string,
  name: string,
  definition: Record<string, unknown>,
  generatorCode: string
): string {
  const blockType = `custom_${id}`;

  Blockly.Blocks[blockType] = {
    init(this: Blockly.Block) {
      const def = definition as {
        colour?: number;
        tooltip?: string;
        inputs?: Array<{ type: string; name: string; label?: string; options?: string[][] }>;
        hasOutput?: boolean;
        hasPrevious?: boolean;
        hasNext?: boolean;
      };

      this.appendDummyInput().appendField(name);

      if (def.inputs) {
        for (const input of def.inputs) {
          if (input.type === 'field_dropdown') {
            this.appendDummyInput()
              .appendField(input.label ?? '')
              .appendField(new Blockly.FieldDropdown(input.options as Blockly.MenuOption[] ?? [['option', 'option']]), input.name);
          } else if (input.type === 'field_number') {
            this.appendDummyInput()
              .appendField(input.label ?? '')
              .appendField(new Blockly.FieldNumber(0), input.name);
          } else if (input.type === 'field_text') {
            this.appendDummyInput()
              .appendField(input.label ?? '')
              .appendField(new Blockly.FieldTextInput(''), input.name);
          }
        }
      }

      if (def.hasOutput) this.setOutput(true, null);
      if (def.hasPrevious) this.setPreviousStatement(true, null);
      if (def.hasNext) this.setNextStatement(true, null);
      this.setColour(def.colour ?? 230);
      this.setTooltip(def.tooltip ?? name);
    },
  };

  registeredCustomBlocks.set(blockType, { name, blockType, definition, generatorCode });
  return blockType;
}

export function unregisterCustomBlock(id: string): void {
  const blockType = `custom_${id}`;
  delete Blockly.Blocks[blockType];
  registeredCustomBlocks.delete(blockType);
}

export function getCustomBlockGenerator(blockType: string): string | null {
  return registeredCustomBlocks.get(blockType)?.generatorCode ?? null;
}

export function isCustomBlock(blockType: string): boolean {
  return blockType.startsWith('custom_');
}

export function getAllRegisteredCustomBlocks(): RegisteredCustomBlock[] {
  return Array.from(registeredCustomBlocks.values());
}
