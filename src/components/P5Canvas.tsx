import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { AudioData } from '@/engine/AudioAnalyser';
import type { VisualDefinition, VisualShape, Modulation } from '@/engine/types';

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
  const shaderCacheRef = useRef(new Map<string, p5.Shader>());

  // Keep refs in sync
  visualRef.current = visual;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        const parent = containerRef.current!;
        p.createCanvas(parent.clientWidth, parent.clientHeight, p.WEBGL);
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

        // In WEBGL mode, origin is at center. Shift to top-left for 2D shapes.
        p.translate(-p.width / 2, -p.height / 2);

        // Render each shape
        for (const shape of vis.shapes) {
          renderShape(p, shape, audioData, shaderCacheRef.current);
        }
      };

    };

    p5Ref.current = new p5(sketch, containerRef.current);

    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      if (p5Ref.current && container) {
        p5Ref.current.resizeCanvas(container.clientWidth, container.clientHeight);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="p5-canvas" />;
}

function renderShape(p: p5, shape: VisualShape, audioData: AudioData, shaderCache: Map<string, p5.Shader>): void {
  // Evaluate modulations
  let x = (shape.x * p.width) / 100; // percentage-based
  let y = (shape.y * p.height) / 100;
  let size = shape.size;
  let hue = 0;

  for (const mod of shape.modulations) {
    const value = getModulationValue(mod, audioData, p);
    switch (mod.property) {
      case 'size':
        size += value;
        break;
      case 'x':
        x += value;
        break;
      case 'y':
        y += value;
        break;
      case 'hue':
        hue += value;
        break;
    }
  }

  // Apply fill/stroke
  const fc = p.color(shape.fillColor);
  p.fill((p.hue(fc) + hue) % 360, p.saturation(fc), p.brightness(fc), 80);
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
    case 'shader':
      renderShader(p, shape, audioData, shaderCache);
      break;
  }
}

function getModulationValue(
  mod: Modulation,
  audioData: AudioData,
  p: p5
): number {
  let raw = 0;
  switch (mod.source) {
    case 'freq': {
      const [lo, hi] = mod.freqRange ?? [0, audioData.frequency.length];
      let sum = 0;
      for (let i = lo; i < hi && i < audioData.frequency.length; i++) {
        sum += audioData.frequency[i];
      }
      raw = sum / (hi - lo) / 255; // normalize 0-1
      break;
    }
    case 'waveform': {
      let sum = 0;
      for (const v of audioData.waveform) {
        sum += Math.abs(v - 128);
      }
      raw = sum / audioData.waveform.length / 128; // normalize 0-1
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
      raw = (p.frameCount % 360) / 360; // 0-1 cycle
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

function drawSpectrum(
  p: p5,
  frequency: Uint8Array,
  _shape: VisualShape
): void {
  const barWidth = p.width / frequency.length;
  p.noStroke();
  for (let i = 0; i < frequency.length; i++) {
    const h = p.map(frequency[i], 0, 255, 0, p.height);
    const hue = p.map(i, 0, frequency.length, 0, 360);
    p.fill(hue, 80, 90, 70);
    p.rect(i * barWidth, p.height - h, barWidth, h);
  }
}

const DEFAULT_VERT = `
attribute vec3 aPosition;
void main() {
  vec4 pos = vec4(aPosition, 1.0);
  pos.xy = pos.xy * 2.0 - 1.0;
  gl_Position = pos;
}
`;

function renderShader(
  p: p5,
  shape: VisualShape,
  audioData: AudioData,
  shaderCache: Map<string, p5.Shader>
): void {
  if (!shape.fragmentShader) return;

  let shader = shaderCache.get(shape.id);
  if (!shader) {
    try {
      shader = p.createShader(DEFAULT_VERT, shape.fragmentShader);
      shaderCache.set(shape.id, shader);
    } catch (e) {
      console.error('Shader compilation error:', e);
      return;
    }
  }

  p.push();
  // Reset translation so shader covers full canvas
  p.resetMatrix();
  p.shader(shader);
  shader.setUniform('u_resolution', [p.width, p.height]);
  shader.setUniform('u_time', p.millis() / 1000.0);

  // Audio uniforms
  let bass = 0;
  let treble = 0;
  for (let i = 0; i < 4 && i < audioData.frequency.length; i++) {
    bass += audioData.frequency[i];
  }
  bass = bass / 4 / 255;
  const mid = Math.floor(audioData.frequency.length / 2);
  for (let i = mid; i < audioData.frequency.length; i++) {
    treble += audioData.frequency[i];
  }
  treble = treble / (audioData.frequency.length - mid) / 255;

  shader.setUniform('u_bass', bass);
  shader.setUniform('u_treble', treble);

  p.noStroke();
  p.rect(0, 0, p.width, p.height);
  p.resetShader();
  p.pop();
}

export default P5Canvas;
