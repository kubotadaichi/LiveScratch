import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Toolbar } from '@/components/Toolbar';
import { BlocklyEditor, type BlocklyEditorHandle } from '@/components/BlocklyEditor';
const LazyP5Canvas = lazy(() => import('@/components/P5Canvas'));
import { CodePanel } from '@/components/CodePanel';
import { StatusBar } from '@/components/StatusBar';
import { AuthDialog } from '@/components/AuthDialog';
import { ProjectListDialog } from '@/components/ProjectListDialog';
import { CustomBlockDialog } from '@/components/CustomBlockDialog';
import { BlockBrowserDialog } from '@/components/BlockBrowserDialog';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAuth } from '@/hooks/useAuth';
import { useProject, type ProjectMeta } from '@/hooks/useProject';
import { useCustomBlocks, type CustomBlockMeta, type CustomBlockFull } from '@/hooks/useCustomBlocks';
import { registerCustomBlock, unregisterCustomBlock } from '@/blocks/customBlockRegistry';
import type { LiveScratchIR, Track } from '@/engine/types';
import './App.css';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

function Editor() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isPlaying, bpm, position, play, stop, setBPM, applyIR, getAudioData, applyCustomCodeToTrack, getTracksCustomCodeStatus } = useAudioEngine();
  const { user, loading: authLoading, signInWithGoogle, signInWithGitHub, signOut } = useAuth();
  const {
    projectId,
    projectTitle,
    saving,
    saveProject,
    loadProject,
    listMyProjects,
    deleteProject,
    newProject,
    setProjectTitle,
  } = useProject();

  const [ir, setIR] = useState<LiveScratchIR>({ bpm: 120, tracks: [] });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [myProjects, setMyProjects] = useState<ProjectMeta[]>([]);
  const [editorReady, setEditorReady] = useState(false);
  const [visualBgMode, setVisualBgMode] = useState(false);
  const isMobile = useIsMobile();

  // Custom blocks
  const { listMyBlocks, listPublicBlocks, getBlock, saveBlock, deleteBlock: deleteCustomBlock } = useCustomBlocks();
  const [showBlockBrowser, setShowBlockBrowser] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CustomBlockFull | null>(null);
  const [myBlocks, setMyBlocks] = useState<CustomBlockMeta[]>([]);
  const [publicBlocks, setPublicBlocks] = useState<CustomBlockMeta[]>([]);
  const [installedBlockIds, setInstalledBlockIds] = useState<Set<string>>(new Set());

  const editorRef = useRef<BlocklyEditorHandle>(null);

  const selectedTrack: Track | null =
    ir.tracks.find((t) => t.id === selectedBlockId) ?? null;

  const handleIRChange = useCallback(
    (newIR: LiveScratchIR) => {
      // Check if any tracks with customCode are being modified by block changes
      const currentTracks = ir.tracks.filter((t) => t.customCode);
      if (currentTracks.length > 0) {
        const affected = currentTracks.filter((ct) => {
          const newTrack = newIR.tracks.find((nt) => nt.id === ct.id);
          if (!newTrack) return true; // track removed
          // Compare without customCode
          const { customCode: _a, ...prevBase } = ct;
          const { customCode: _b, ...nextBase } = newTrack;
          return JSON.stringify(prevBase) !== JSON.stringify(nextBase);
        });

        if (affected.length > 0) {
          const keep = confirm(
            'Some tracks have custom code edits. Block changes will discard custom code for affected tracks. Continue?'
          );
          if (!keep) return;
          // Strip customCode from affected tracks
          newIR = {
            ...newIR,
            tracks: newIR.tracks.map((t) =>
              affected.some((a) => a.id === t.id)
                ? { ...t, customCode: undefined }
                : { ...t, customCode: ir.tracks.find((ct) => ct.id === t.id)?.customCode }
            ),
          };
        } else {
          // Preserve customCode for unchanged tracks
          newIR = {
            ...newIR,
            tracks: newIR.tracks.map((t) => ({
              ...t,
              customCode: ir.tracks.find((ct) => ct.id === t.id)?.customCode,
            })),
          };
        }
      }
      setIR(newIR);
      applyIR(newIR);
    },
    [applyIR, ir.tracks]
  );

  const handleBPMChange = useCallback(
    (newBpm: number) => {
      setBPM(newBpm);
      setIR((prev) => ({ ...prev, bpm: newBpm }));
    },
    [setBPM]
  );

  const handleResetCode = useCallback(
    (trackId: string) => {
      setIR((prev) => {
        const next = {
          ...prev,
          tracks: prev.tracks.map((t) =>
            t.id === trackId ? { ...t, customCode: undefined } : t
          ),
        };
        applyIR(next);
        return next;
      });
    },
    [applyIR]
  );

  // Load shared project from URL
  useEffect(() => {
    if (paramId && editorReady) {
      loadProject(paramId).then((project) => {
        if (project) {
          editorRef.current?.loadWorkspace(project.workspace);
        }
      });
    }
  }, [paramId, editorReady, loadProject]);

  // Space key to toggle play/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isPlaying) stop();
        else play();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, stop]);

  // Note: customCode is session-only; project save/load uses block workspace only
  const handleSave = useCallback(async () => {
    if (!user || !editorRef.current) return;
    const workspace = editorRef.current.saveWorkspace();
    const title = projectTitle || 'Untitled';
    const id = await saveProject(user.id, title, workspace);
    if (id && !projectId) {
      navigate(`/p/${id}`, { replace: true });
    }
  }, [user, projectTitle, saveProject, projectId, navigate]);

  // Open handler
  const handleOpen = useCallback(async () => {
    if (!user) return;
    const projects = await listMyProjects(user.id);
    setMyProjects(projects);
    setShowProjectList(true);
  }, [user, listMyProjects]);

  // Select project from list
  const handleSelectProject = useCallback(
    async (id: string) => {
      const project = await loadProject(id);
      if (project && editorRef.current) {
        editorRef.current.loadWorkspace(project.workspace);
        navigate(`/p/${id}`, { replace: true });
      }
    },
    [loadProject, navigate]
  );

  // Delete project
  const handleDeleteProject = useCallback(
    async (id: string) => {
      if (!confirm('Delete this project?')) return;
      const ok = await deleteProject(id);
      if (ok && user) {
        const projects = await listMyProjects(user.id);
        setMyProjects(projects);
      }
    },
    [deleteProject, listMyProjects, user]
  );

  // New project
  const handleNewProject = useCallback(() => {
    newProject();
    editorRef.current?.clearWorkspace();
    navigate('/', { replace: true });
    setShowProjectList(false);
  }, [newProject, navigate]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (!user || !editorRef.current) return;
    // Save first if not saved
    const workspace = editorRef.current.saveWorkspace();
    const id = await saveProject(user.id, projectTitle || 'Untitled', workspace);
    if (id) {
      const url = `${window.location.origin}/p/${id}`;
      navigate(`/p/${id}`, { replace: true });
      try {
        await navigator.clipboard.writeText(url);
        alert(`Link copied!\n${url}`);
      } catch {
        prompt('Copy this link to share:', url);
      }
    }
  }, [user, projectTitle, saveProject, navigate]);

  // Auth handler
  const handleAuth = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  // Custom blocks handlers
  const handleRefreshBlocks = useCallback(async () => {
    if (user) {
      setMyBlocks(await listMyBlocks(user.id));
    }
    setPublicBlocks(await listPublicBlocks());
  }, [user, listMyBlocks, listPublicBlocks]);

  const handleInstallBlock = useCallback(async (id: string) => {
    const block = await getBlock(id);
    if (!block) return;
    registerCustomBlock(id, block.name, block.definition, block.generator_code);
    setInstalledBlockIds(prev => new Set([...prev, id]));
    editorRef.current?.refreshToolbox();
  }, [getBlock]);

  const handleUninstallBlock = useCallback((id: string) => {
    unregisterCustomBlock(id);
    setInstalledBlockIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    editorRef.current?.refreshToolbox();
  }, []);

  const handleSaveCustomBlock = useCallback(async (block: Parameters<typeof saveBlock>[1]) => {
    if (!user) return;
    await saveBlock(user.id, block);
    handleRefreshBlocks();
  }, [user, saveBlock, handleRefreshBlocks]);

  const handleEditBlock = useCallback(async (id: string) => {
    const block = await getBlock(id);
    if (block) {
      setEditingBlock(block);
      setShowBlockEditor(true);
    }
  }, [getBlock]);

  const handleDeleteCustomBlock = useCallback(async (id: string) => {
    if (!confirm('Delete this custom block?')) return;
    handleUninstallBlock(id);
    await deleteCustomBlock(id);
    handleRefreshBlocks();
  }, [deleteCustomBlock, handleUninstallBlock, handleRefreshBlocks]);

  if (authLoading) return null;

  return (
    <div className="app">
      <Toolbar
        isPlaying={isPlaying}
        bpm={bpm}
        onPlay={play}
        onStop={stop}
        onBPMChange={handleBPMChange}
        showCodePanel={showCodePanel}
        onToggleCodePanel={() => setShowCodePanel((v) => !v)}
        user={user}
        projectTitle={projectTitle}
        onTitleChange={setProjectTitle}
        saving={saving}
        onSave={handleSave}
        onOpen={handleOpen}
        onShare={handleShare}
        onAuth={handleAuth}
        onSignOut={signOut}
        visualBgMode={visualBgMode}
        onToggleVisualBg={() => setVisualBgMode((v) => !v)}
        isMobile={isMobile}
        onCustomBlocks={() => setShowBlockBrowser(true)}
      />
      <Group orientation={isMobile ? 'vertical' : 'horizontal'} id={isMobile ? 'live-scratch-panels-mobile' : 'live-scratch-panels'} className="panel-group">
        <Panel defaultSize={visualBgMode ? '100%' : '40%'} minSize="20%" className="panel-workspace" id="workspace">
          {visualBgMode && ir.visual && (
            <Suspense fallback={null}>
              <LazyP5Canvas
                visual={ir.visual}
                getAudioData={getAudioData}
                isPlaying={isPlaying}
                overlay
              />
            </Suspense>
          )}
          <BlocklyEditor
            ref={editorRef}
            onIRChange={handleIRChange}
            onBlockSelect={setSelectedBlockId}
            onReady={() => setEditorReady(true)}
            getTracksCustomCodeStatus={getTracksCustomCodeStatus}
            transparentBg={visualBgMode}
          />
        </Panel>
        {!visualBgMode && (
          <>
            <Separator className="resize-handle" />
            <Panel defaultSize={showCodePanel ? '40%' : '60%'} minSize="15%" className="panel-canvas" id="canvas">
              {ir.visual && (
                <Suspense fallback={null}>
                  <LazyP5Canvas
                    visual={ir.visual}
                    getAudioData={getAudioData}
                    isPlaying={isPlaying}
                  />
                </Suspense>
              )}
            </Panel>
          </>
        )}
        {showCodePanel && (
          <>
            <Separator className="resize-handle" />
            <Panel defaultSize="20%" minSize="15%" className="panel-code" id="codepanel">
              <CodePanel
                track={selectedTrack}
                applyCustomCode={applyCustomCodeToTrack}
                onReset={handleResetCode}
              />
            </Panel>
          </>
        )}
      </Group>
      <StatusBar
        isPlaying={isPlaying}
        bpm={bpm}
        trackCount={ir.tracks.length}
        position={position}
      />
      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onGoogle={signInWithGoogle}
        onGitHub={signInWithGitHub}
      />
      <ProjectListDialog
        open={showProjectList}
        onClose={() => setShowProjectList(false)}
        projects={myProjects}
        onSelect={handleSelectProject}
        onDelete={handleDeleteProject}
        onNew={handleNewProject}
      />
      <BlockBrowserDialog
        open={showBlockBrowser}
        onClose={() => setShowBlockBrowser(false)}
        myBlocks={myBlocks}
        publicBlocks={publicBlocks}
        installedIds={installedBlockIds}
        onInstall={handleInstallBlock}
        onUninstall={handleUninstallBlock}
        onEdit={handleEditBlock}
        onDelete={handleDeleteCustomBlock}
        onCreate={() => { setEditingBlock(null); setShowBlockEditor(true); }}
        onRefresh={handleRefreshBlocks}
      />
      <CustomBlockDialog
        open={showBlockEditor}
        onClose={() => { setShowBlockEditor(false); setEditingBlock(null); }}
        onSave={handleSaveCustomBlock}
        initial={editingBlock ?? undefined}
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Editor />} />
      <Route path="/p/:id" element={<Editor />} />
    </Routes>
  );
}

export default App;
