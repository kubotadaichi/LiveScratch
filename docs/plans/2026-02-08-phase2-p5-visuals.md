# Phase 2: p5.js Audio-Reactive Visuals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** p5.jsキャンバスを統合し、音声データ（FFT/Waveform）に反応するビジュアルをブロックで組み立てられるようにする

**Architecture:** AudioEngineにWeb Audio APIのAnalyserNodeを接続してFFT/波形データを取得。p5.jsキャンバスをReactコンポーネントとして中央に配置。VisualDefinition IRを新設し、既存のブロック→IR→エンジンパターンを踏襲してビジュアルを描画する。

**Tech Stack:** p5.js, Web Audio API AnalyserNode, Tone.js, Blockly, React

---

### Task 1: p5.js インストールと型定義

**Files:**
- Modify: `package.json`

**Step 1: p5.js をインストール**

Run: `npm install p5 @types/p5`

**Step 2: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add p5.js dependency"
```

---

### Task 2: Visual 型定義の追加

**Files:**
- Modify: `src/engine/types.ts`

**Step 1: VisualDefinition 関連の型を追加**

`src/engine/types.ts` の末尾に追加:

```typescript
// === Visual Types ===

export type ShapeType = 'circle' | 'rect' | 'waveform' | 'spectrum';
export type ModulationSource = 'freq' | 'waveform' | 'beat' | 'time';

export interface Modulation {
  source: ModulationSource;
  property: string;       // e.g. 'size', 'hue', 'x', 'y'
  scale: number;
  offset: number;
  freqRange?: [number, number]; // for 'freq' source: bin range
}

export interface VisualShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  fillColor: string;
  strokeColor: string;
  strokeWeight: number;
  modulations: Modulation[];
  customCode?: string;
}

export interface VisualConfig {
  backgroundColor: string;
  backgroundFade: number;  // 0-1, 0=full clear, 1=no clear (trail)
}

export interface VisualDefinition {
  config: VisualConfig;
  shapes: VisualShape[];
}
```

`LiveScratchIR` に `visual?` フィールドを追加:

```typescript
export interface LiveScratchIR {
  bpm: number;
  tracks: Track[];
  visual?: VisualDefinition;
}
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat: add VisualDefinition types for Phase 2"
```

---

### Task 3: AudioEngine に AnalyserNode を統合

**Files:**
- Create: `src/engine/AudioAnalyser.ts`
- Modify: `src/engine/AudioEngine.ts`
- Modify: `src/hooks/useAudioEngine.ts`

**Step 1: AudioAnalyser クラスを作成**

`src/engine/AudioAnalyser.ts`:

```typescript
import * as Tone from 'tone';

export interface AudioData {
  frequency: Uint8Array;
  waveform: Uint8Array;
}

export class AudioAnalyser {
  private analyser: AnalyserNode;
  private freqData: Uint8Array;
  private waveData: Uint8Array;

  constructor() {
    const context = Tone.getContext().rawContext as AudioContext;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveData = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect Tone.js destination to analyser
    Tone.getDestination().connect(this.analyser);
  }

  getData(): AudioData {
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.waveData);
    return { frequency: this.freqData, waveform: this.waveData };
  }

  dispose(): void {
    this.analyser.disconnect();
  }
}
```

**Step 2: AudioEngine に analyser を追加**

`AudioEngine.ts` の `start()` 内で AudioAnalyser を生成:

```typescript
import { AudioAnalyser, type AudioData } from './AudioAnalyser';

// フィールド追加
private analyser: AudioAnalyser | null = null;

// start() 内に追加
async start(): Promise<void> {
  await Tone.start();
  if (!this.analyser) {
    this.analyser = new AudioAnalyser();
  }
  Tone.getTransport().start();
  this.isPlaying = true;
}

// 新メソッド
getAudioData(): AudioData | null {
  return this.analyser?.getData() ?? null;
}

// dispose() に追加
dispose(): void {
  this.stop();
  this.analyser?.dispose();
  this.analyser = null;
  // ... existing cleanup
}
```

**Step 3: useAudioEngine フックに getAudioData を追加**

```typescript
const getAudioData = useCallback(() => {
  return engineRef.current?.getAudioData() ?? null;
}, []);

return { isPlaying, bpm, play, stop, setBPM, applyIR, getAudioData };
```

**Step 4: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 5: Commit**

```bash
git add src/engine/AudioAnalyser.ts src/engine/AudioEngine.ts src/hooks/useAudioEngine.ts
git commit -m "feat: add AudioAnalyser for FFT/waveform data"
```

---

### Task 4: P5Canvas コンポーネント作成

**Files:**
- Create: `src/components/P5Canvas.tsx`

**Step 1: p5.js インスタンスモードのReactラッパーを作成**

`src/components/P5Canvas.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { AudioData } from '@/engine/AudioAnalyser';
import type { VisualDefinition } from '@/engine/types';

interface P5CanvasProps {
  visual: VisualDefinition | undefined;
  getAudioData: () => AudioData | null;
  isPlaying: boolean;
}

export function P5Canvas({ visual, getAudioData, isPlaying }: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const visualRef = useRef(visual);
  const isPlayingRef = useRef(isPlaying);

  // Keep refs in sync
  visualRef.current = visual;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        const parent = containerRef.current!;
        p.createCanvas(parent.clientWidth, parent.clientHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
      };

      p.draw = () => {
        const vis = visualRef.current;
        const config = vis?.config;

        // Background with fade
        if (config) {
          const fade = Math.round((1 - config.backgroundFade) * 255);
          const c = p.color(config.backgroundColor);
          p.background(p.red(c), p.green(c), p.blue(c), fade);
        } else {
          p.background(0);
        }

        if (!isPlayingRef.current || !vis) return;

        const audioData = getAudioData();
        if (!audioData) return;

        // Render each shape
        for (const shape of vis.shapes) {
          renderShape(p, shape, audioData);
        }
      };

      p.windowResized = () => {
        const parent = containerRef.current;
        if (parent) {
          p.resizeCanvas(parent.clientWidth, parent.clientHeight);
        }
      };
    };

    p5Ref.current = new p5(sketch, containerRef.current);

    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="p5-canvas" />;
}

function renderShape(p: p5, shape: VisualShape, audioData: AudioData): void {
  // Evaluate modulations
  let x = shape.x * p.width / 100;   // percentage-based
  let y = shape.y * p.height / 100;
  let size = shape.size;
  let hue = 0;

  for (const mod of shape.modulations) {
    const value = getModulationValue(mod, audioData, p);
    switch (mod.property) {
      case 'size': size += value; break;
      case 'x': x += value; break;
      case 'y': y += value; break;
      case 'hue': hue += value; break;
    }
  }

  // Apply fill/stroke
  const fc = p.color(shape.fillColor);
  p.fill(
    (p.hue(fc) + hue) % 360,
    p.saturation(fc),
    p.brightness(fc),
    80
  );
  if (shape.strokeWeight > 0) {
    p.stroke(shape.strokeColor);
    p.strokeWeight(shape.strokeWeight);
  } else {
    p.noStroke();
  }

  // Draw shape
  switch (shape.type) {
    case 'circle':
      p.ellipse(x, y, size, size);
      break;
    case 'rect':
      p.rectMode(p.CENTER);
      p.rect(x, y, size, size);
      break;
    case 'waveform':
      drawWaveform(p, audioData.waveform, shape);
      break;
    case 'spectrum':
      drawSpectrum(p, audioData.frequency, shape);
      break;
  }
}

function getModulationValue(
  mod: Modulation,
  audioData: AudioData,
  p: p5,
): number {
  let raw = 0;
  switch (mod.source) {
    case 'freq': {
      const [lo, hi] = mod.freqRange ?? [0, audioData.frequency.length];
      let sum = 0;
      for (let i = lo; i < hi && i < audioData.frequency.length; i++) {
        sum += audioData.frequency[i];
      }
      raw = sum / (hi - lo) / 255;  // normalize 0-1
      break;
    }
    case 'waveform': {
      let sum = 0;
      for (const v of audioData.waveform) {
        sum += Math.abs(v - 128);
      }
      raw = sum / audioData.waveform.length / 128;  // normalize 0-1
      break;
    }
    case 'beat': {
      // Pulse based on low-frequency energy (kick detection)
      let sum = 0;
      for (let i = 0; i < 4 && i < audioData.frequency.length; i++) {
        sum += audioData.frequency[i];
      }
      raw = sum / 4 / 255;
      break;
    }
    case 'time': {
      raw = (p.frameCount % 360) / 360;  // 0-1 cycle
      break;
    }
  }
  return raw * mod.scale + mod.offset;
}

function drawWaveform(p: p5, waveform: Uint8Array, shape: VisualShape): void {
  p.noFill();
  p.stroke(shape.strokeColor || shape.fillColor);
  p.strokeWeight(shape.strokeWeight || 2);
  p.beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const x = p.map(i, 0, waveform.length, 0, p.width);
    const y = p.map(waveform[i], 0, 255, 0, p.height);
    p.vertex(x, y);
  }
  p.endShape();
}

function drawSpectrum(p: p5, frequency: Uint8Array, shape: VisualShape): void {
  const barWidth = p.width / frequency.length;
  p.noStroke();
  for (let i = 0; i < frequency.length; i++) {
    const h = p.map(frequency[i], 0, 255, 0, p.height);
    const hue = p.map(i, 0, frequency.length, 0, 360);
    p.fill(hue, 80, 90, 70);
    p.rect(i * barWidth, p.height - h, barWidth, h);
  }
}

// Re-export for type usage in renderShape
import type { VisualShape, Modulation } from '@/engine/types';
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/components/P5Canvas.tsx
git commit -m "feat: add P5Canvas component with audio-reactive rendering"
```

---

### Task 5: レイアウト変更（3カラム化）

**Files:**
- Modify: `src/App.css`
- Modify: `src/App.tsx`

**Step 1: CSS Grid を3カラムに変更**

`src/App.css` のグリッド定義を更新:

```css
.app {
  display: grid;
  grid-template-rows: var(--toolbar-height) 1fr var(--statusbar-height);
  grid-template-columns: 1fr 1fr 400px;
  grid-template-areas:
    "toolbar toolbar toolbar"
    "workspace canvas codepanel"
    "statusbar statusbar statusbar";
  height: 100vh;
  width: 100vw;
}

.app.code-panel-hidden {
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "toolbar toolbar"
    "workspace canvas"
    "statusbar statusbar";
}
```

新しい `.p5-canvas` スタイルを追加:

```css
.p5-canvas {
  grid-area: canvas;
  background: #000;
  overflow: hidden;
  border-left: 1px solid var(--border);
}

.p5-canvas canvas {
  display: block;
}
```

**Step 2: App.tsx に P5Canvas を追加**

```typescript
import { P5Canvas } from '@/components/P5Canvas';

// useAudioEngine から getAudioData を取得
const { isPlaying, bpm, play, stop, setBPM, applyIR, getAudioData } = useAudioEngine();

// JSX に P5Canvas を追加 (BlocklyEditor と CodePanel の間)
<P5Canvas
  visual={ir.visual}
  getAudioData={getAudioData}
  isPlaying={isPlaying}
/>
```

**Step 3: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 4: Commit**

```bash
git add src/App.css src/App.tsx
git commit -m "feat: 3-column layout with p5.js canvas"
```

---

### Task 6: Visual ブロック定義

**Files:**
- Create: `src/blocks/definitions/visual.ts`
- Modify: `src/blocks/toolbox.ts`
- Modify: `src/blocks/index.ts`

**Step 1: Visual ブロックを定義**

`src/blocks/definitions/visual.ts`:

```typescript
import * as Blockly from 'blockly';

export function registerVisualBlocks(): void {
  // Canvas config block
  Blockly.Blocks['canvas_config'] = {
    init(this: Blockly.Block) {
      this.appendStatementInput('SHAPES')
        .appendField('canvas');
      this.appendDummyInput()
        .appendField('bg')
        .appendField(new Blockly.FieldColour('#000000'), 'BG_COLOR')
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
        .appendField(new Blockly.FieldColour('#ff00ff'), 'FILL')
        .appendField('stroke')
        .appendField(new Blockly.FieldColour('#ffffff'), 'STROKE')
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
        .appendField(new Blockly.FieldColour('#00ffff'), 'FILL')
        .appendField('stroke')
        .appendField(new Blockly.FieldColour('#ffffff'), 'STROKE')
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
        .appendField(new Blockly.FieldColour('#00ff00'), 'COLOR')
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
      this.appendDummyInput()
        .appendField('spectrum');
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
        .appendField(new Blockly.FieldDropdown([
          ['size', 'size'],
          ['x', 'x'],
          ['y', 'y'],
          ['hue', 'hue'],
        ]), 'PROPERTY')
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
        .appendField(new Blockly.FieldDropdown([
          ['size', 'size'],
          ['x', 'x'],
          ['y', 'y'],
          ['hue', 'hue'],
        ]), 'PROPERTY')
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
        .appendField(new Blockly.FieldDropdown([
          ['size', 'size'],
          ['x', 'x'],
          ['y', 'y'],
          ['hue', 'hue'],
        ]), 'PROPERTY')
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
        .appendField(new Blockly.FieldDropdown([
          ['hue', 'hue'],
          ['x', 'x'],
          ['y', 'y'],
          ['size', 'size'],
        ]), 'PROPERTY')
        .appendField('scale')
        .appendField(new Blockly.FieldNumber(360, -500, 500, 10), 'SCALE');
      this.setOutput(true, 'Modulation');
      this.setColour(40);
      this.setTooltip('Modulate by time (cyclic)');
    },
  };
}
```

**Step 2: toolbox.ts に Visual カテゴリを追加**

```typescript
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
    { kind: 'block', type: 'mod_freq' },
    { kind: 'block', type: 'mod_waveform' },
    { kind: 'block', type: 'mod_beat' },
    { kind: 'block', type: 'mod_time' },
  ],
},
```

**Step 3: blocks/index.ts に登録を追加**

```typescript
import { registerVisualBlocks } from './definitions/visual';
// registerAllBlocks() 内に追加:
registerVisualBlocks();
```

**Step 4: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 5: Commit**

```bash
git add src/blocks/definitions/visual.ts src/blocks/toolbox.ts src/blocks/index.ts
git commit -m "feat: add Visual block definitions and toolbox category"
```

---

### Task 7: Visual IR ジェネレーター

**Files:**
- Modify: `src/blocks/generators/jsonGenerator.ts`

**Step 1: Visual ブロックから VisualDefinition を生成する関数を追加**

`jsonGenerator.ts` に追加:

```typescript
import type { ..., VisualDefinition, VisualShape, VisualConfig, Modulation } from '@/engine/types';

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
        freqRange: [modBlock.getFieldValue('RANGE_LO'), modBlock.getFieldValue('RANGE_HI')],
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

function getVisualDefinition(workspace: Blockly.Workspace): VisualDefinition | undefined {
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
            x: 0, y: 0, size: 0,
            fillColor: '#000000',
            strokeColor: block.getFieldValue('COLOR'),
            strokeWeight: block.getFieldValue('STROKE_WEIGHT'),
            modulations: [],
          });
        } else if (block.type === 'visual_spectrum') {
          shapes.push({
            id: block.id,
            type: 'spectrum',
            x: 0, y: 0, size: 0,
            fillColor: '#000000', strokeColor: '#000000', strokeWeight: 0,
            modulations: [],
          });
        }
        block = block.getNextBlock();
      }
      return { config, shapes };
    }
  }
  return undefined;
}
```

`workspaceToIR()` の return 文を更新:

```typescript
return { bpm, tracks, visual: getVisualDefinition(workspace) };
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/blocks/generators/jsonGenerator.ts
git commit -m "feat: generate VisualDefinition IR from visual blocks"
```

---

### Task 8: 統合テストと仕上げ

**Files:**
- Modify: `src/components/BlocklyEditor.tsx` (初期テンプレートにビジュアル追加)
- Modify: `docs/TODO.md`

**Step 1: 初期テンプレートに canvas_config + visual_spectrum を追加**

BlocklyEditor.tsx の初期ブロック生成部分の末尾（loopBlock接続後）に追加:

```typescript
// Visual template: canvas with spectrum
const canvasBlock = workspace.newBlock('canvas_config');
canvasBlock.setFieldValue('#000000', 'BG_COLOR');
canvasBlock.setFieldValue(0, 'FADE');
canvasBlock.initSvg();
canvasBlock.render();
canvasBlock.moveBy(50, 350);

const spectrumBlock = workspace.newBlock('visual_spectrum');
spectrumBlock.initSvg();
spectrumBlock.render();

canvasBlock.getInput('SHAPES')!.connection!.connect(spectrumBlock.previousConnection!);
```

**Step 2: docs/TODO.md を更新**

フェーズ2の完了項目にチェックを入れ、残課題を追記。

**Step 3: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 4: 動作確認**

Run: `npx vite --host`

1. ブラウザでアクセス
2. 左にBlockly、中央にp5.jsキャンバス（黒背景）が表示される
3. Playボタンでキック+ハイハットが鳴る
4. キャンバスにスペクトラムが表示される
5. Visualカテゴリから circle ブロックを追加し、mod_freq を接続
6. 円が音に反応してサイズ変化

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete - p5.js audio-reactive visuals"
```

---

## 依存関係

```
Task 1 (install p5)
  → Task 2 (types)
    → Task 3 (AudioAnalyser)
    → Task 6 (visual blocks)
      → Task 7 (visual IR generator)
  → Task 4 (P5Canvas component)
    → Task 5 (layout)
      → Task 8 (integration)
```

## 設計判断

1. **react-p5 不使用**: カスタムフックのほうがオーディオデータ連携を細かく制御できる
2. **インスタンスモード**: p5.js のグローバル汚染を避ける
3. **パーセンテージ座標**: キャンバスサイズに依存しないレスポンシブ配置
4. **Modulation チェーン**: Effect チェーンと同じパターンで連結可能
5. **AnalyserNode 直接利用**: Tone.js のFFTクラスより軽量で柔軟
