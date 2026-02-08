export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Source',
      colour: '210',
      contents: [
        { kind: 'block', type: 'synth_source' },
        { kind: 'block', type: 'sampler_source' },
      ],
    },
    {
      kind: 'category',
      name: 'Pattern',
      colour: '160',
      contents: [
        { kind: 'block', type: 'beat_pattern' },
        { kind: 'block', type: 'note_pattern' },
        { kind: 'block', type: 'sequence_pattern' },
      ],
    },
    {
      kind: 'category',
      name: 'Effect',
      colour: '120',
      contents: [
        { kind: 'block', type: 'reverb_effect' },
        { kind: 'block', type: 'delay_effect' },
        { kind: 'block', type: 'filter_effect' },
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      colour: '290',
      contents: [
        { kind: 'block', type: 'loop_block' },
        { kind: 'block', type: 'track_block' },
        { kind: 'block', type: 'bpm_block' },
      ],
    },
  ],
};
