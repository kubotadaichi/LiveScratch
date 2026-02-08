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
