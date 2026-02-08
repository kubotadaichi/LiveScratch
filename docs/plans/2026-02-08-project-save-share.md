# Project Save & Share Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Supabaseを使ってプロジェクトの保存・短縮URL共有を実装する。認証なしでもエディタは遊べる状態を維持する。

**Architecture:** Supabase（PostgreSQL + Auth）をバックエンドに使用。Blocklyワークスペースの状態を `Blockly.serialization.workspaces.save()` でJSON化してSupabaseのprojectsテーブルに保存。react-router-domで `/p/:id` ルーティングを追加し、共有URLからプロジェクトを復元する。認証はSupabase Auth（Google OAuth + GitHub OAuth）で、未ログインでもエディタは使えるがSave/Shareボタンはログイン後のみ有効にする。

**Tech Stack:** Supabase (DB + Auth), react-router-dom, Blockly serialization API

---

### Task 1: Supabase セットアップと依存インストール

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase.ts`
- Create: `.env.local` (gitignore済み前提)

**Step 1: 依存をインストール**

Run: `npm install @supabase/supabase-js react-router-dom`

**Step 2: 環境変数ファイルを作成**

`.env.local`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

`.env.local` が `.gitignore` に含まれていることを確認。なければ追加。

**Step 3: Supabase クライアントを作成**

`src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Step 4: DB型定義のスタブを作成**

`src/lib/database.types.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          workspace: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          workspace: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          workspace?: Record<string, unknown>;
          updated_at?: string;
        };
      };
    };
  };
}
```

**Step 5: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし（env変数は実行時に解決されるため型チェックは通る）

**Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/supabase.ts src/lib/database.types.ts .gitignore
git commit -m "chore: add Supabase client and dependencies"
```

---

### Task 2: Supabase マイグレーション（projects テーブル）

**Files:**
- Create: `supabase/migrations/001_create_projects.sql`

**Step 1: マイグレーションSQL を作成**

`supabase/migrations/001_create_projects.sql`:

```sql
-- Projects table
create table public.projects (
  id text primary key default nanoid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  workspace jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- nanoid function for short IDs (7 chars, URL-safe)
create or replace function nanoid(size int default 7)
returns text as $$
declare
  id text := '';
  i int := 0;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
begin
  for i in 1..size loop
    id := id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return id;
end;
$$ language plpgsql;

-- RLS policies
alter table public.projects enable row level security;

-- Anyone can read projects (for sharing)
create policy "projects_select_all" on public.projects
  for select using (true);

-- Only owner can insert
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

-- Only owner can update
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);

-- Only owner can delete
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at();
```

**Step 2: Supabase ダッシュボードの SQL Editor でこのSQLを実行**

または Supabase CLI を使う場合:
Run: `npx supabase db push`

**Step 3: Supabase Auth で Google / GitHub OAuth を有効化**

Supabase ダッシュボード > Authentication > Providers で：
- Google OAuth を有効化（Client ID / Secret を設定）
- GitHub OAuth を有効化（Client ID / Secret を設定）
- Redirect URL: `http://localhost:5173` (dev) と本番URLを追加

**Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase migration for projects table"
```

---

### Task 3: 認証フック (useAuth)

**Files:**
- Create: `src/hooks/useAuth.ts`

**Step 1: useAuth フックを作成**

`src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithGitHub = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, loading, signInWithGoogle, signInWithGitHub, signOut };
}
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook for Supabase authentication"
```

---

### Task 4: プロジェクト保存・読込フック (useProject)

**Files:**
- Create: `src/hooks/useProject.ts`

**Step 1: useProject フックを作成**

`src/hooks/useProject.ts`:

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProjectMeta {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedProject {
  id: string;
  title: string;
  workspace: Record<string, unknown>;
}

export function useProject() {
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled');

  const saveProject = useCallback(
    async (
      userId: string,
      title: string,
      workspace: Record<string, unknown>
    ): Promise<string | null> => {
      setSaving(true);
      try {
        if (projectId) {
          // Update existing
          const { error } = await supabase
            .from('projects')
            .update({ title, workspace })
            .eq('id', projectId)
            .eq('user_id', userId);
          if (error) throw error;
          setProjectTitle(title);
          return projectId;
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('projects')
            .insert({ user_id: userId, title, workspace })
            .select('id')
            .single();
          if (error) throw error;
          setProjectId(data.id);
          setProjectTitle(title);
          return data.id;
        }
      } catch (err) {
        console.error('Save failed:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  const loadProject = useCallback(
    async (id: string): Promise<SavedProject | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, workspace')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      setProjectId(data.id);
      setProjectTitle(data.title);
      return data as SavedProject;
    },
    []
  );

  const listMyProjects = useCallback(
    async (userId: string): Promise<ProjectMeta[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) return [];
      return data as ProjectMeta[];
    },
    []
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) return false;
      if (projectId === id) {
        setProjectId(null);
        setProjectTitle('Untitled');
      }
      return true;
    },
    [projectId]
  );

  const newProject = useCallback(() => {
    setProjectId(null);
    setProjectTitle('Untitled');
  }, []);

  return {
    projectId,
    projectTitle,
    saving,
    saveProject,
    loadProject,
    listMyProjects,
    deleteProject,
    newProject,
    setProjectTitle,
  };
}
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/hooks/useProject.ts
git commit -m "feat: add useProject hook for CRUD operations"
```

---

### Task 5: BlocklyEditor にワークスペース保存・復元メソッドを追加

**Files:**
- Modify: `src/components/BlocklyEditor.tsx`

**Step 1: BlocklyEditor に ref 経由のシリアライゼーション API を公開**

`BlocklyEditor` に `forwardRef` + `useImperativeHandle` を追加し、親から `saveWorkspace()` / `loadWorkspace()` を呼べるようにする。

`src/components/BlocklyEditor.tsx` の変更:

先頭の import を変更:
```typescript
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as Blockly from 'blockly';
```

`BlocklyEditor` 関数を `forwardRef` でラップし、`useImperativeHandle` を追加:

```typescript
export interface BlocklyEditorHandle {
  saveWorkspace: () => Record<string, unknown>;
  loadWorkspace: (state: Record<string, unknown>) => void;
  clearWorkspace: () => void;
}

export const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(
  function BlocklyEditor({ onIRChange, onBlockSelect, resizeTrigger }, ref) {
    // ... existing code ...

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
        // Re-create default template
        createInitialTemplate(workspaceRef.current);
        handleWorkspaceChange();
      },
    }));

    // ... rest of existing code ...
  }
);
```

初期テンプレート生成部分を `createInitialTemplate(workspace)` 関数に抽出する（既存の loopBlock〜spectrumBlock 接続コード）。

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/components/BlocklyEditor.tsx
git commit -m "feat: expose workspace save/load/clear via BlocklyEditorHandle"
```

---

### Task 6: ログインダイアログコンポーネント

**Files:**
- Create: `src/components/AuthDialog.tsx`
- Modify: `src/App.css`

**Step 1: AuthDialog コンポーネントを作成**

`src/components/AuthDialog.tsx`:

```typescript
interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onGoogle: () => void;
  onGitHub: () => void;
}

export function AuthDialog({ open, onClose, onGoogle, onGitHub }: AuthDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Sign in to save & share</h3>
        <p className="dialog-subtitle">
          Sign in to save your projects and share them with others.
        </p>
        <div className="dialog-actions-vertical">
          <button className="auth-btn google" onClick={onGoogle}>
            Continue with Google
          </button>
          <button className="auth-btn github" onClick={onGitHub}>
            Continue with GitHub
          </button>
        </div>
        <button className="dialog-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

**Step 2: App.css にダイアログとAuthボタンのスタイルを追加**

```css
/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 420px;
}

.dialog h3 {
  margin: 0 0 8px;
  color: var(--text-primary);
}

.dialog-subtitle {
  color: var(--text-secondary);
  font-size: 0.85em;
  margin: 0 0 20px;
}

.dialog-actions-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.auth-btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9em;
  cursor: pointer;
  text-align: center;
}

.auth-btn:hover {
  background: var(--border);
}

.dialog-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85em;
  padding: 4px 0;
}
```

**Step 3: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 4: Commit**

```bash
git add src/components/AuthDialog.tsx src/App.css
git commit -m "feat: add AuthDialog component"
```

---

### Task 7: プロジェクト一覧ダイアログ

**Files:**
- Create: `src/components/ProjectListDialog.tsx`
- Modify: `src/App.css`

**Step 1: ProjectListDialog コンポーネントを作成**

`src/components/ProjectListDialog.tsx`:

```typescript
import type { ProjectMeta } from '@/hooks/useProject';

interface ProjectListDialogProps {
  open: boolean;
  onClose: () => void;
  projects: ProjectMeta[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ProjectListDialog({
  open,
  onClose,
  projects,
  onSelect,
  onDelete,
  onNew,
}: ProjectListDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>My Projects</h3>
          <button className="btn-small" onClick={onNew}>
            + New
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="dialog-empty">No saved projects yet.</p>
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id} className="project-item">
                <button
                  className="project-item-main"
                  onClick={() => {
                    onSelect(p.id);
                    onClose();
                  }}
                >
                  <span className="project-title">{p.title}</span>
                  <span className="project-date">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </button>
                <button
                  className="project-item-delete"
                  onClick={() => onDelete(p.id)}
                  title="Delete"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
```

**Step 2: App.css にプロジェクト一覧スタイルを追加**

```css
/* Project List Dialog */
.dialog-wide {
  min-width: 400px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.dialog-header h3 {
  margin: 0;
}

.btn-small {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--accent);
  color: white;
  font-size: 0.8em;
  cursor: pointer;
}

.dialog-empty {
  color: var(--text-secondary);
  text-align: center;
  padding: 24px 0;
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.project-item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.project-item-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  padding: 10px 8px;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.project-item-main:hover {
  background: var(--bg-primary);
}

.project-title {
  font-weight: 500;
}

.project-date {
  color: var(--text-secondary);
  font-size: 0.8em;
}

.project-item-delete {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  font-size: 0.9em;
}

.project-item-delete:hover {
  color: #e94560;
}
```

**Step 3: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 4: Commit**

```bash
git add src/components/ProjectListDialog.tsx src/App.css
git commit -m "feat: add ProjectListDialog component"
```

---

### Task 8: Toolbar に Save / Open / Share / Auth ボタンを追加

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/App.css`

**Step 1: Toolbar の props を拡張しボタンを追加**

`src/components/Toolbar.tsx` を更新:

```typescript
import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

interface ToolbarProps {
  isPlaying: boolean;
  bpm: number;
  onPlay: () => void;
  onStop: () => void;
  onBPMChange: (bpm: number) => void;
  showCodePanel: boolean;
  onToggleCodePanel: () => void;
  // Project & Auth
  user: User | null;
  projectTitle: string;
  saving: boolean;
  onSave: () => void;
  onOpen: () => void;
  onShare: () => void;
  onAuth: () => void;
  onSignOut: () => void;
}

export function Toolbar({
  isPlaying,
  bpm,
  onPlay,
  onStop,
  onBPMChange,
  showCodePanel,
  onToggleCodePanel,
  user,
  projectTitle,
  saving,
  onSave,
  onOpen,
  onShare,
  onAuth,
  onSignOut,
}: ToolbarProps) {
  const handleBPMChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 40 && val <= 300) onBPMChange(val);
    },
    [onBPMChange]
  );

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">Live Scratch</span>
        <span className="toolbar-project-title">{projectTitle}</span>
      </div>
      <div className="toolbar-center">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>
        <label className="bpm-control">
          BPM
          <input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={handleBPMChange}
          />
        </label>
      </div>
      <div className="toolbar-right">
        {user ? (
          <>
            <button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onOpen}>Open</button>
            <button onClick={onShare}>Share</button>
            <button onClick={onToggleCodePanel}>
              {showCodePanel ? 'Hide Code' : 'Show Code'}
            </button>
            <button className="auth-avatar" onClick={onSignOut} title="Sign out">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                user.email?.charAt(0).toUpperCase()
              )}
            </button>
          </>
        ) : (
          <>
            <button onClick={onAuth}>Sign in</button>
            <button onClick={onToggleCodePanel}>
              {showCodePanel ? 'Hide Code' : 'Show Code'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: App.css にツールバーの追加スタイル**

```css
.toolbar-project-title {
  color: var(--text-secondary);
  font-size: 0.85em;
  margin-left: 8px;
}

.auth-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75em;
  font-weight: 600;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
}

.auth-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**Step 3: ビルド確認**

Run: `npx tsc --noEmit`
Expected: App.tsx でToolbarに新しいpropsを渡していないためエラーが出る。Task 9 で修正する。

**Step 4: Commit**

```bash
git add src/components/Toolbar.tsx src/App.css
git commit -m "feat: add Save/Open/Share/Auth buttons to Toolbar"
```

---

### Task 9: React Router 導入と App.tsx 統合

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

**Step 1: main.tsx に BrowserRouter を追加**

`src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
```

**Step 2: App.tsx を大幅更新**

`src/App.tsx` を更新。主要な変更点：

1. `useAuth` / `useProject` フックを接続
2. `BlocklyEditor` を `ref` で扱う
3. `useParams` で `/p/:id` をハンドリング
4. Save / Open / Share のハンドラ追加
5. `AuthDialog` / `ProjectListDialog` の表示制御
6. Toolbar に新しい props を渡す

```typescript
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

  const { isPlaying, bpm, play, stop, setBPM, applyIR, getAudioData } = useAudioEngine();
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

  const handleCustomCode = useCallback(
    (trackId: string, code: string) => {
      setIR((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, customCode: code } : t
        ),
      }));
    },
    []
  );

  // Load shared project from URL
  useEffect(() => {
    if (paramId && editorRef.current) {
      loadProject(paramId).then((project) => {
        if (project) {
          editorRef.current?.loadWorkspace(project.workspace);
        }
      });
    }
  }, [paramId, loadProject]);

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
      await navigator.clipboard.writeText(url);
      navigate(`/p/${id}`, { replace: true });
      alert(`Link copied!\n${url}`);
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
```

**Step 3: Vite SPA fallback を追加**

`vite.config.ts` を更新。`appType: 'spa'` はViteのデフォルトなので dev server は自動対応。本番ではホスティング側で設定が必要（Vercel/Netlify は自動対応）。

**Step 4: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: integrate Router, Auth, Project save/load/share into App"
```

---

### Task 10: 動作確認と TODO 更新

**Files:**
- Modify: `docs/TODO.md`

**Step 1: `.env.local` にSupabase認証情報を設定**

実際のSupabaseプロジェクトの URL と anon key を `.env.local` に設定する。

**Step 2: 動作確認**

Run: `npx vite --host`

1. ブラウザでアクセス — エディタが表示される（未ログインでも遊べる）
2. 「Sign in」クリック → AuthDialog → Google/GitHub でログイン
3. ログイン後、ツールバーに Save / Open / Share ボタンが表示される
4. ブロックを編集 → Save → 成功
5. Share → URLがクリップボードにコピーされる
6. 別のブラウザ/シークレットで共有URLを開く → プロジェクトが復元される
7. Open → プロジェクト一覧ダイアログ → 選択で切り替え

**Step 3: docs/TODO.md を更新**

```markdown
## フェーズ2（p5.js ビジュアル）

- [x] p5.js キャンバスの統合
- [x] オーディオリアクティブビジュアル（FFT / Waveform 連携）
- [x] ビジュアル用ブロックカテゴリの追加
- [x] ユーザー認証
- [x] プロジェクト保存・共有
```

**Step 4: Commit**

```bash
git add docs/TODO.md
git commit -m "feat: project save & share complete"
```

---

## 依存関係

```
Task 1 (Supabase setup)
  → Task 2 (DB migration)
  → Task 3 (useAuth)
  → Task 4 (useProject)
  → Task 5 (BlocklyEditor ref API)
  → Task 6 (AuthDialog)
  → Task 7 (ProjectListDialog)
  → Task 8 (Toolbar buttons)
    → Task 9 (App.tsx integration)
      → Task 10 (verification)
```

## 設計判断

1. **Blocklyシリアライゼーション**: IRではなくBlocklyワークスペース状態を保存。IRはブロックから再生成されるため冗長。`Blockly.serialization.workspaces.save/load` (JSON形式) を使用。
2. **短縮ID**: PostgreSQLの `nanoid()` 関数で7文字のURL-safe IDを生成。UUIDより短くURL共有に適する。
3. **RLS**: 読み取りは全員可（共有URLのため）、書き込みは所有者のみ。
4. **認証なしでも遊べる**: Auth状態に関係なくエディタは完全動作。Save/Share ボタンのみログイン必須。
5. **forwardRef パターン**: BlocklyEditorは内部にworkspaceRefを持つため、親からの操作は `useImperativeHandle` で公開。
