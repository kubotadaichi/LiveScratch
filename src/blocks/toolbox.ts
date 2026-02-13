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
    {
      kind: 'category',
      name: 'Visual',
      colour: '30',
      contents: [
        { kind: 'block', type: 'canvas_config' },
        { kind: 'block', type: 'visual_circle' },
        { kind: 'block', type: 'visual_rect' },
        { kind: 'block', type: 'visual_waveform' },
        { kind: 'block', type: 'visual_spectrum' },
        { kind: 'block', type: 'visual_shader' },
        { kind: 'block', type: 'mod_freq' },
        { kind: 'block', type: 'mod_waveform' },
        { kind: 'block', type: 'mod_beat' },
        { kind: 'block', type: 'mod_time' },
        {
          kind: 'label',
          text: '── Presets ──',
        },
        {
          kind: 'block',
          type: 'canvas_config',
          fields: { BG_COLOR: '#000000', FADE: 0.1 },
          inputs: {
            SHAPES: {
              block: {
                type: 'visual_circle',
                fields: { X: 50, Y: 50, SIZE: 100, FILL: '#ff00ff', STROKE: '#ffffff', STROKE_WEIGHT: 0 },
                inputs: {
                  MODULATIONS: {
                    block: {
                      type: 'mod_beat',
                      fields: { PROPERTY: 'size', SCALE: 200 },
                    },
                  },
                },
                next: {
                  block: {
                    type: 'visual_waveform',
                    fields: { COLOR: '#00ff00', STROKE_WEIGHT: 2 },
                  },
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'canvas_config',
          fields: { BG_COLOR: '#0a0a2e', FADE: 0.95 },
          inputs: {
            SHAPES: {
              block: {
                type: 'visual_circle',
                fields: { X: 50, Y: 50, SIZE: 50, FILL: '#00ffff', STROKE: '#00ffff', STROKE_WEIGHT: 2 },
                inputs: {
                  MODULATIONS: {
                    block: {
                      type: 'mod_freq',
                      fields: { PROPERTY: 'size', SCALE: 300, RANGE_LO: 0, RANGE_HI: 10 },
                      inputs: {
                        NEXT_MOD: {
                          block: {
                            type: 'mod_time',
                            fields: { PROPERTY: 'hue', SCALE: 360 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'canvas_config',
          fields: { BG_COLOR: '#000000', FADE: 0 },
          inputs: {
            SHAPES: {
              block: {
                type: 'visual_spectrum',
              },
            },
          },
        },
      ],
    },
  ],
};
