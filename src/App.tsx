import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { Toolbar } from '@/components/Toolbar';
import { BlocklyEditor, type BlocklyEditorHandle } from '@/components/BlocklyEditor';
import { P5Canvas } from '@/components/P5Canvas';
import { CodePanel } from '@/components/CodePanel';
import { StatusBar } from '@/components/StatusBar';
import { AuthDialog } from '@/components/AuthDialog';
import { ProjectListDialog } from '@/components/ProjectListDialog';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAuth } from '@/hooks/useAuth';
import { useProject, type ProjectMeta } from '@/hooks/useProject';
import type { LiveScratchIR, Track } from '@/engine/types';
import './App.css';

function Editor() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isPlaying, bpm, position, play, stop, setBPM, applyIR, getAudioData } = useAudioEngine();
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

  const editorRef = useRef<BlocklyEditorHandle>(null);

  const selectedTrack: Track | null =
    ir.tracks.find((t) => t.id === selectedBlockId) ?? null;

  const handleIRChange = useCallback(
    (newIR: LiveScratchIR) => {
      setIR(newIR);
      applyIR(newIR);
    },
    [applyIR]
  );

  const handleBPMChange = useCallback(
    (newBpm: number) => {
      setBPM(newBpm);
      setIR((prev) => ({ ...prev, bpm: newBpm }));
    },
    [setBPM]
  );

  const applyIRDebounced = useRef<ReturnType<typeof setTimeout>>();

  const handleCustomCode = useCallback(
    (trackId: string, code: string) => {
      setIR((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, customCode: code } : t
        ),
      }));

      // Debounce audio engine application
      clearTimeout(applyIRDebounced.current);
      applyIRDebounced.current = setTimeout(() => {
        setIR((current) => {
          applyIR(current);
          return current;
        });
      }, 500);
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

  // Save handler
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

  if (authLoading) return null;

  return (
    <div className={`app ${showCodePanel ? '' : 'code-panel-hidden'}`}>
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
      />
      <BlocklyEditor
        ref={editorRef}
        onIRChange={handleIRChange}
        onBlockSelect={setSelectedBlockId}
        resizeTrigger={showCodePanel}
        onReady={() => setEditorReady(true)}
      />
      <P5Canvas
        visual={ir.visual}
        getAudioData={getAudioData}
        isPlaying={isPlaying}
      />
      {showCodePanel && (
        <CodePanel track={selectedTrack} onCustomCode={handleCustomCode} />
      )}
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
