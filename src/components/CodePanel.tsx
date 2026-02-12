import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import type { Track } from '@/engine/types';

interface CodePanelProps {
  track: Track | null;
  applyCustomCode: (trackId: string, code: string) => void;
  onReset?: (trackId:string) => void;
}

function trackToCode(track: Track): string {
  const lines: string[] = ['// Tone.js code for this track', ''];

  // Source
  if (track.source.type === 'synth') {
    lines.push(`const synth = new Tone.Synth({`);
    lines.push(`  oscillator: { type: "${track.source.waveform}" }`);
    lines.push(`}).toDestination();`);
  } else {
    const synthMap: Record<string, string> = {
      kick: 'MembraneSynth',
      snare: 'NoiseSynth',
      hihat: 'MetalSynth',
      clap: 'NoiseSynth',
    };
    lines.push(`const synth = new Tone.${synthMap[track.source.sample]}().toDestination();`);
  }
  lines.push('');

  // Effects
  for (const effect of track.effects) {
    if (effect.type === 'reverb') {
      lines.push(`const reverb = new Tone.Reverb({ decay: ${effect.decay} });`);
      lines.push(`reverb.wet.value = ${effect.wet};`);
    } else if (effect.type === 'delay') {
      lines.push(`const delay = new Tone.FeedbackDelay("${effect.time}", ${effect.feedback});`);
      lines.push(`delay.wet.value = ${effect.wet};`);
    } else if (effect.type === 'filter') {
      lines.push(`const filter = new Tone.Filter(${effect.frequency}, "${effect.filterType}");`);
    }
  }
  if (track.effects.length > 0) lines.push('');

  // Pattern
  if (track.pattern.type === 'beat') {
    lines.push(`const steps = "${track.pattern.steps}".split("").map(c => c === "x" ? 1 : null);`);
    lines.push(`const seq = new Tone.Sequence((time, value) => {`);
    lines.push(`  if (value) synth.triggerAttackRelease("C4", "8n", time);`);
    lines.push(`}, steps, "8n").start(0);`);
  } else if (track.pattern.type === 'note') {
    lines.push(`const seq = new Tone.Sequence((time, pitch) => {`);
    lines.push(`  synth.triggerAttackRelease(pitch, "8n", time);`);
    lines.push(`}, ["${track.pattern.pitch}"], "4n").start(0);`);
  } else if (track.pattern.type === 'sequence') {
    const pitchArr = track.pattern.pitches.map(p => `"${p}"`).join(', ');
    lines.push(`const seq = new Tone.Sequence((time, pitch) => {`);
    lines.push(`  synth.triggerAttackRelease(pitch, "8n", time);`);
    lines.push(`}, [${pitchArr}], "4n").start(0);`);
  }

  return lines.join('\n');
}

export function CodePanel({ track, applyCustomCode, onReset }: CodePanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  const [customCode, setCustomCode] = useState<string>('');
  const [appliedCode, setAppliedCode] = useState<string>('');
  
  const hasUnappliedChanges = customCode !== appliedCode;

  // When track changes, update the code in the editor
  useEffect(() => {
    const newCode = track ? (track.customCode || trackToCode(track)) : '// Select a track block to view its code';
    setCustomCode(newCode);
    setAppliedCode(newCode); // Reset applied code on track change
    
    if (viewRef.current) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: newCode }
      });
    }
  }, [track]);


  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: customCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCustomCode(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // Should only run once

  const handleApplyCode = () => {
    if (track) {
      applyCustomCode(track.id, customCode);
      setAppliedCode(customCode);
    }
  };

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <span>Code {track ? `- ${track.id}` : ''}</span>
        <div className="code-panel-actions">
          {track?.customCode && (
            <>
              <span className="custom-badge">Custom</span>
              <button
                className="code-panel-reset"
                onClick={() => track && onReset?.(track.id)}
              >
                Reset to Generated
              </button>
            </>
          )}
        </div>
      </div>
      <div ref={editorRef} className="code-panel-editor" />
      <div className="flex justify-between items-center p-2 border-t border-gray-700">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          onClick={handleApplyCode}
          disabled={!hasUnappliedChanges || !customCode || !track}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
