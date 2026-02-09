import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/blocks';
import { toolbox } from '@/blocks/toolbox';
import { workspaceToIR } from '@/blocks/generators/jsonGenerator';
import type { LiveScratchIR } from '@/engine/types';

const darkTheme = Blockly.Theme.defineTheme('live-scratch-dark', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#1a1a2e',
    toolboxBackgroundColour: '#16213e',
    toolboxForegroundColour: '#e0e0e0',
    flyoutBackgroundColour: '#0f3460',
    flyoutForegroundColour: '#e0e0e0',
    flyoutOpacity: 0.9,
    scrollbarColour: '#4a4a6a',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#e94560',
    insertionMarkerOpacity: 0.4,
  },
});

export interface BlocklyEditorHandle {
  saveWorkspace: () => Record<string, unknown>;
  loadWorkspace: (state: Record<string, unknown>) => void;
  clearWorkspace: () => void;
}

interface BlocklyEditorProps {
  onIRChange: (ir: LiveScratchIR) => void;
  onBlockSelect?: (blockId: string | null) => void;
  resizeTrigger?: unknown;
  onReady?: () => void;
}

function createInitialTemplate(workspace: Blockly.WorkspaceSvg) {
  // Initial template: loop > bpm + kick track + hihat track
  const loopBlock = workspace.newBlock('loop_block');
  loopBlock.initSvg();
  loopBlock.render();
  loopBlock.moveBy(50, 50);

  const bpmBlock = workspace.newBlock('bpm_block');
  bpmBlock.setFieldValue(120, 'BPM');
  bpmBlock.initSvg();
  bpmBlock.render();

  const kickTrack = workspace.newBlock('track_block');
  kickTrack.initSvg();
  kickTrack.render();

  const kickSource = workspace.newBlock('sampler_source');
  kickSource.setFieldValue('kick', 'SAMPLE');
  kickSource.initSvg();
  kickSource.render();

  const kickPattern = workspace.newBlock('beat_pattern');
  kickPattern.setFieldValue('x---x---', 'STEPS');
  kickPattern.initSvg();
  kickPattern.render();

  const hihatTrack = workspace.newBlock('track_block');
  hihatTrack.initSvg();
  hihatTrack.render();

  const hihatSource = workspace.newBlock('sampler_source');
  hihatSource.setFieldValue('hihat', 'SAMPLE');
  hihatSource.initSvg();
  hihatSource.render();

  const hihatPattern = workspace.newBlock('beat_pattern');
  hihatPattern.setFieldValue('--x---x-', 'STEPS');
  hihatPattern.initSvg();
  hihatPattern.render();

  // Connect blocks
  kickTrack.getInput('SOURCE')!.connection!.connect(kickSource.outputConnection!);
  kickTrack.getInput('PATTERN')!.connection!.connect(kickPattern.outputConnection!);
  hihatTrack.getInput('SOURCE')!.connection!.connect(hihatSource.outputConnection!);
  hihatTrack.getInput('PATTERN')!.connection!.connect(hihatPattern.outputConnection!);
  bpmBlock.nextConnection!.connect(kickTrack.previousConnection!);
  kickTrack.nextConnection!.connect(hihatTrack.previousConnection!);
  loopBlock.getInput('TRACKS')!.connection!.connect(bpmBlock.previousConnection!);

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
}

export const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(
  function BlocklyEditor({ onIRChange, onBlockSelect, resizeTrigger, onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    const handleWorkspaceChange = useCallback(() => {
      if (!workspaceRef.current) return;
      const ir = workspaceToIR(workspaceRef.current);
      onIRChange(ir);
    }, [onIRChange]);

    useImperativeHandle(ref, () => ({
      saveWorkspace: () => {
        if (!workspaceRef.current) return {};
        return Blockly.serialization.workspaces.save(workspaceRef.current);
      },
      loadWorkspace: (state: Record<string, unknown>) => {
        if (!workspaceRef.current) return;
        Blockly.serialization.workspaces.load(state, workspaceRef.current);
        handleWorkspaceChange();
      },
      clearWorkspace: () => {
        if (!workspaceRef.current) return;
        workspaceRef.current.clear();
        createInitialTemplate(workspaceRef.current);
        handleWorkspaceChange();
      },
    }));

    useEffect(() => {
      if (!containerRef.current || workspaceRef.current) return;

      registerAllBlocks();

      const workspace = Blockly.inject(containerRef.current, {
        toolbox,
        grid: {
          spacing: 20,
          length: 3,
          colour: '#2a2a4a',
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        trashcan: true,
        theme: darkTheme,
        renderer: 'zelos',
      });

      workspaceRef.current = workspace;

      createInitialTemplate(workspace);

      workspace.addChangeListener((e: Blockly.Events.Abstract) => {
        if (e.type === Blockly.Events.BLOCK_CHANGE ||
            e.type === Blockly.Events.BLOCK_CREATE ||
            e.type === Blockly.Events.BLOCK_DELETE ||
            e.type === Blockly.Events.BLOCK_MOVE) {
          handleWorkspaceChange();
        }
        if (e.type === Blockly.Events.SELECTED) {
          const selectEvent = e as Blockly.Events.Selected;
          const blockId = selectEvent.newElementId;
          if (blockId) {
            const block = workspace.getBlockById(blockId);
            if (block?.type === 'track_block') {
              onBlockSelect?.(block.id);
            } else {
              onBlockSelect?.(null);
            }
          } else {
            onBlockSelect?.(null);
          }
        }
      });

      // Initial IR generation
      handleWorkspaceChange();
      onReady?.();

      return () => {
        workspace.dispose();
        workspaceRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle resize (window + layout changes like code panel toggle)
    useEffect(() => {
      const handleResize = () => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      };
      window.addEventListener('resize', handleResize);
      const timer = setTimeout(handleResize, 50);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
      };
    }, [resizeTrigger]);

    return <div ref={containerRef} className="blockly-editor" />;
  }
);
