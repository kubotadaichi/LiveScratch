# Known Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** バンドルサイズ削減（dynamic import）、トラックID自動採番、小節番号リアルタイム表示、プロジェクト名インライン編集の4つの改善を実装する。

**Architecture:** Vite の manualChunks で Blockly/Tone/p5 を分離チャンクに切り出し、初期ロードサイズを削減。track_block の TRACK_ID フィールドを FieldTextInput から自動採番 FieldLabel に変更し、IR 生成時にブロック ID ベースでユニーク ID を生成。StatusBar に Tone.getTransport().position をポーリングして表示。Toolbar のプロジェクト名をクリックで編集可能な入力欄に切り替え。

**Tech Stack:** Vite rollupOptions (manualChunks), Tone.js Transport API, Blockly FieldLabel

---

### Task 1: Vite manualChunks でバンドル分割

**Files:**
- Modify: `vite.config.ts`

**Step 1: 現在のバンドルサイズを計測**

Run: `npx vite build 2>&1 | grep -E '(\.js|\.css)' | head -20`
Expected: 単一の大きなチャンク（~900KB gzip）が表示される

**Step 2: manualChunks を設定**

`vite.config.ts` を以下に変更：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          blockly: ['blockly', '@blockly/field-colour'],
          tone: ['tone'],
          p5: ['p5'],
        },
      },
    },
  },
})
```

**Step 3: ビルドしてチャンク分割を確認**

Run: `npx vite build 2>&1 | grep -E '(\.js|\.css)' | head -20`
Expected: blockly, tone, p5 が個別チャンクに分離。メインチャンクが大幅に縮小。

**Step 4: dev server で動作確認**

Run: `npx vite --host &`
ブラウザで http://localhost:5173/ にアクセスし、エディタが正常に動作することを確認。

**Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "perf: split blockly/tone/p5 into separate chunks via manualChunks"
```

---

### Task 2: トラックID 自動採番 — ブロック定義変更

**Files:**
- Modify: `src/blocks/definitions/control.ts`

**Step 1: track_block の TRACK_ID フィールドを自動採番に変更**

`src/blocks/definitions/control.ts` の `track_block` 定義を変更する。`FieldTextInput` を連番ラベルに置き換える。Blockly の `init` 内でブロック自身の ID から短いラベルを生成する。

```typescript
import * as Blockly from 'blockly';

let trackCounter = 0;

export function registerControlBlocks(): void {
  Blockly.Blocks['loop_block'] = {
    init(this: Blockly.Block) {
      this.appendStatementInput('TRACKS')
        .appendField('loop');
      this.setColour(290);
      this.setTooltip('Loop container for tracks');
    },
  };

  Blockly.Blocks['track_block'] = {
    init(this: Blockly.Block) {
      trackCounter++;
      this.appendValueInput('SOURCE')
        .setCheck('Source')
        .appendField('track')
        .appendField(String(trackCounter), 'TRACK_ID');
      this.appendValueInput('PATTERN')
        .setCheck('Pattern')
        .appendField('pattern');
      this.appendValueInput('EFFECTS')
        .setCheck('Effect')
        .appendField('effects');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Audio track');
    },
  };

  Blockly.Blocks['bpm_block'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('BPM')
        .appendField(new Blockly.FieldNumber(120, 40, 300, 1), 'BPM');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Set tempo in BPM');
    },
  };
}
```

**注意:** `FieldLabel`（文字列をappendFieldに直接渡す）はシリアライゼーション時に値が保存される。`getFieldValue('TRACK_ID')` で取得可能。ただし Blockly のシリアライゼーション/デシリアライゼーションでカウンターがリセットされるため、ワークスペース復元時にも一意性を保つ必要がある。

**問題:** `FieldLabel` はシリアライズで値が保持されない場合がある。代わりに `FieldTextInput` を残しつつデフォルト値を自動採番にするか、ブロック ID をそのままトラック ID として使うアプローチを検討。

**改善案:** ブロック ID（Blockly が自動生成する一意ID）をトラック ID として使う。これが最もシンプルで確実。

`src/blocks/definitions/control.ts` を以下に変更：

```typescript
import * as Blockly from 'blockly';

let trackCounter = 0;

export function registerControlBlocks(): void {
  Blockly.Blocks['loop_block'] = {
    init(this: Blockly.Block) {
      this.appendStatementInput('TRACKS')
        .appendField('loop');
      this.setColour(290);
      this.setTooltip('Loop container for tracks');
    },
  };

  Blockly.Blocks['track_block'] = {
    init(this: Blockly.Block) {
      trackCounter++;
      const label = `Track ${trackCounter}`;
      this.appendValueInput('SOURCE')
        .setCheck('Source')
        .appendField('track')
        .appendField(new Blockly.FieldLabel(label), 'TRACK_LABEL');
      this.appendValueInput('PATTERN')
        .setCheck('Pattern')
        .appendField('pattern');
      this.appendValueInput('EFFECTS')
        .setCheck('Effect')
        .appendField('effects');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Audio track');
    },
  };

  Blockly.Blocks['bpm_block'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('BPM')
        .appendField(new Blockly.FieldNumber(120, 40, 300, 1), 'BPM');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Set tempo in BPM');
    },
  };
}
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/blocks/definitions/control.ts
git commit -m "feat: auto-number track blocks with FieldLabel"
```

---

### Task 3: トラックID 自動採番 — IR 生成でブロック ID を使用

**Files:**
- Modify: `src/blocks/generators/jsonGenerator.ts`

**Step 1: workspaceToIR でブロック ID をトラック ID として使用**

`src/blocks/generators/jsonGenerator.ts` の track 部分を変更。`block.getFieldValue('TRACK_ID')` の代わりに `block.id`（Blockly が自動生成する一意のブロック ID）を使う。

`jsonGenerator.ts` の 98-108行目を以下に変更：

```typescript
        } else if (block.type === 'track_block') {
          const source = getSource(block);
          const pattern = getPattern(block);
          if (source && pattern) {
            tracks.push({
              id: block.id,
              source,
              pattern,
              effects: getEffects(block),
            });
          }
        }
```

変更点は1行のみ: `block.getFieldValue('TRACK_ID')` → `block.id`

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: 動作確認**

ブラウザで確認：
- トラックブロックに「Track 1」「Track 2」のラベルが表示される
- 新しいトラックブロックを追加すると自動的に連番が振られる
- 音声の再生が正常に動作する（ブロック ID での diff が機能する）
- プロジェクトの保存・復元でトラックが正しく復元される

**Step 4: Commit**

```bash
git add src/blocks/generators/jsonGenerator.ts
git commit -m "feat: use block ID as track ID for guaranteed uniqueness"
```

---

### Task 4: トラックID 自動採番 — BlocklyEditor 初期テンプレート修正

**Files:**
- Modify: `src/components/BlocklyEditor.tsx`

**Step 1: createInitialTemplate から setFieldValue('TRACK_ID') の呼び出しを削除**

`src/components/BlocklyEditor.tsx` の `createInitialTemplate` 関数で、`kickTrack.setFieldValue('kick', 'TRACK_ID')` と `hihatTrack.setFieldValue('hihat', 'TRACK_ID')` の行を削除する。TRACK_ID フィールドは存在しなくなったため。

削除する行:
```typescript
    kickTrack.setFieldValue('kick', 'TRACK_ID');
    // ...
    hihatTrack.setFieldValue('hihat', 'TRACK_ID');
```

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/components/BlocklyEditor.tsx
git commit -m "fix: remove obsolete TRACK_ID field values from initial template"
```

---

### Task 5: トラックID 自動採番 — onBlockSelect の修正

**Files:**
- Modify: `src/components/BlocklyEditor.tsx`

**Step 1: SELECTED イベントハンドラで TRACK_ID の代わりにブロック ID を使用**

`src/components/BlocklyEditor.tsx` の changeListener 内、SELECTED イベント処理を修正。

現在のコード（168-181行目付近）:
```typescript
        if (e.type === Blockly.Events.SELECTED) {
          const selectEvent = e as Blockly.Events.Selected;
          const blockId = selectEvent.newElementId;
          if (blockId) {
            const block = workspace.getBlockById(blockId);
            if (block?.type === 'track_block') {
              onBlockSelect?.(block.getFieldValue('TRACK_ID'));
            } else {
              onBlockSelect?.(null);
            }
          } else {
            onBlockSelect?.(null);
          }
        }
```

変更後:
```typescript
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
```

変更点は1行のみ: `block.getFieldValue('TRACK_ID')` → `block.id`

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/components/BlocklyEditor.tsx
git commit -m "fix: use block ID for track selection instead of removed TRACK_ID field"
```

---

### Task 6: 小節番号リアルタイム表示 — AudioEngine に getPosition 追加

**Files:**
- Modify: `src/engine/AudioEngine.ts`

**Step 1: getPosition メソッドを追加**

`src/engine/AudioEngine.ts` に `getPosition()` メソッドを追加。Tone.getTransport().position を返す。

`getAudioData()` の後に追加：

```typescript
  getPosition(): string {
    return Tone.getTransport().position as string;
  }
```

`Tone.getTransport().position` は `"bar:beat:sixteenth"` 形式の文字列を返す（例: `"4:2:0"`）。

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/engine/AudioEngine.ts
git commit -m "feat: expose transport position from AudioEngine"
```

---

### Task 7: 小節番号リアルタイム表示 — useAudioEngine にポジション state 追加

**Files:**
- Modify: `src/hooks/useAudioEngine.ts`

**Step 1: position state と requestAnimationFrame ポーリングを追加**

`src/hooks/useAudioEngine.ts` を更新。再生中のみ `requestAnimationFrame` でポーリングし、position state を更新する。

```typescript
import { useRef, useCallback, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { AudioEngine } from '@/engine/AudioEngine';
import type { LiveScratchIR } from '@/engine/types';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(120);
  const [position, setPosition] = useState('0:0:0');

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const play = useCallback(async () => {
    await Tone.start();
    getEngine().start();
    setIsPlaying(true);
  }, [getEngine]);

  const stop = useCallback(() => {
    getEngine().stop();
    setIsPlaying(false);
    setPosition('0:0:0');
  }, [getEngine]);

  const setBPM = useCallback(
    (newBpm: number) => {
      setBpmState(newBpm);
      getEngine().setBPM(newBpm);
    },
    [getEngine]
  );

  const applyIR = useCallback(
    (ir: LiveScratchIR) => {
      setBpmState(ir.bpm);
      getEngine().applyIR(ir);
    },
    [getEngine]
  );

  const getAudioData = useCallback(() => {
    return engineRef.current?.getAudioData() ?? null;
  }, []);

  // Poll transport position during playback
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const poll = () => {
      if (engineRef.current) {
        setPosition(engineRef.current.getPosition());
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return { isPlaying, bpm, position, play, stop, setBPM, applyIR, getAudioData };
}
```

主な変更点：
- `useState('0:0:0')` で position state 追加
- `stop()` で position を `'0:0:0'` にリセット
- `useEffect` で isPlaying 中のみ `requestAnimationFrame` ポーリング
- return に `position` を追加

**Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

**Step 3: Commit**

```bash
git add src/hooks/useAudioEngine.ts
git commit -m "feat: add transport position polling to useAudioEngine"
```

---

### Task 8: 小節番号リアルタイム表示 — StatusBar に表示

**Files:**
- Modify: `src/components/StatusBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Step 1: StatusBar に position prop を追加**

`src/components/StatusBar.tsx` を更新：

```typescript
interface StatusBarProps {
  isPlaying: boolean;
  bpm: number;
  trackCount: number;
  position: string;
}

export function StatusBar({ isPlaying, bpm, trackCount, position }: StatusBarProps) {
  // Parse "bar:beat:sixteenth" → "Bar N | Beat M" (1-indexed for display)
  const parts = position.split(':');
  const bar = parseInt(parts[0], 10) + 1;
  const beat = parseInt(parts[1], 10) + 1;

  return (
    <div className="statusbar">
      <span className={`status-indicator ${isPlaying ? 'active' : ''}`}>
        {isPlaying ? '● Playing' : '○ Stopped'}
      </span>
      {isPlaying && (
        <span className="status-position">
          Bar {bar} : Beat {beat}
        </span>
      )}
      <span className="status-info">
        {bpm} BPM | {trackCount} track{trackCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
```

**Step 2: App.tsx で position を StatusBar に渡す**

`src/App.tsx` の Editor コンポーネント内:

1. `useAudioEngine` から `position` を取り出す:
```typescript
  const { isPlaying, bpm, position, play, stop, setBPM, applyIR, getAudioData } = useAudioEngine();
```

2. StatusBar に渡す:
```typescript
      <StatusBar
        isPlaying={isPlaying}
        bpm={bpm}
        trackCount={ir.tracks.length}
        position={position}
      />
```

**Step 3: App.css にポジション表示のスタイルを追加**

`src/App.css` の `.status-indicator.active` の後に追加：

```css
.status-position {
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-weight: 600;
}
```

`font-variant-numeric: tabular-nums` で数字の幅を等幅にし、表示がガタつかないようにする。

**Step 4: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 5: 動作確認**

ブラウザで確認：
- Play ボタンを押すと StatusBar に「Bar 1 : Beat 1」のような表示が出る
- リアルタイムで更新される
- Stop すると表示が消える

**Step 6: Commit**

```bash
git add src/components/StatusBar.tsx src/App.tsx src/App.css
git commit -m "feat: display real-time bar/beat position in StatusBar"
```

---

### Task 9: プロジェクト名インライン編集

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Step 1: Toolbar に onTitleChange prop を追加し、クリックで編集モードに切り替え**

`src/components/Toolbar.tsx` を更新。`projectTitle` の `<span>` をクリックすると `<input>` に切り替わり、blur または Enter で確定する。

```typescript
import { useCallback, useState, useRef, useEffect } from 'react';
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
  onTitleChange: (title: string) => void;
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
  onTitleChange,
  saving,
  onSave,
  onOpen,
  onShare,
  onAuth,
  onSignOut,
}: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitTitle = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim() || 'Untitled';
    setDraft(trimmed);
    onTitleChange(trimmed);
  }, [draft, onTitleChange]);

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
        {editing ? (
          <input
            ref={inputRef}
            className="toolbar-project-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setDraft(projectTitle);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="toolbar-project-title"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {projectTitle}
          </span>
        )}
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

**Step 2: App.tsx で onTitleChange を Toolbar に渡す**

`src/App.tsx` の `<Toolbar>` に `onTitleChange={setProjectTitle}` を追加：

```typescript
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
```

**Step 3: App.css にインライン編集のスタイルを追加**

`.toolbar-project-title` の後に追加：

```css
.toolbar-project-title {
  color: var(--text-secondary);
  font-size: 0.85em;
  margin-left: 8px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.toolbar-project-title:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.toolbar-project-input {
  font-size: 0.85em;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  width: 160px;
}
```

**注意:** 既存の `.toolbar-project-title` ルールに `cursor: pointer` とホバーエフェクトを追加する形で更新。

**Step 4: ビルド確認**

Run: `npx tsc --noEmit && npx vite build`
Expected: エラーなし

**Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/App.tsx src/App.css
git commit -m "feat: add inline project title editing in Toolbar"
```

---

### Task 10: TODO 更新

**Files:**
- Modify: `docs/TODO.md`

**Step 1: 完了した改善点をチェック**

`docs/TODO.md` の「既知の改善点」セクションを更新：

```markdown
## 既知の改善点

- [x] バンドルサイズが大きい（~2.9MB）— Blockly/Tone.js/p5.js の manualChunks による分割
- [x] ブロックのトラックIDが手入力 — ブロック ID ベースの自動採番
- [x] 小節番号のリアルタイム表示（Transport.position の購読）
```

**Step 2: Commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark known improvements as complete"
```

---

## 依存関係

```
Task 1 (バンドル分割)         — 独立
Task 2 (track_block 定義変更) — 独立
Task 3 (IR 生成変更)          — Task 2 に依存
Task 4 (テンプレート修正)     — Task 2 に依存
Task 5 (onBlockSelect 修正)   — Task 2 に依存
Task 6 (AudioEngine position) — 独立
Task 7 (useAudioEngine poll)  — Task 6 に依存
Task 8 (StatusBar 表示)       — Task 7 に依存
Task 9 (プロジェクト名編集)   — 独立
Task 10 (TODO 更新)           — 全タスクに依存
```

## 設計判断

1. **manualChunks vs React.lazy**: manualChunks はブラウザキャッシュを最適化する最もシンプルな方法。React.lazy での遅延読み込みは将来的に追加可能だが、今回は chunk 分割のみで十分な効果がある。
2. **ブロック ID をトラック ID に**: Blockly が自動生成するブロック ID は一意で、シリアライゼーション時にも保持される。ユーザーが手入力する必要がなくなり、重複の心配もない。表示用のラベル（Track 1, Track 2...）は FieldLabel で別途管理。
3. **requestAnimationFrame ポーリング**: Tone.getTransport() のイベントリスナーも使えるが、requestAnimationFrame は UI 更新と同期するためスムーズ。ポーリング頻度はブラウザのリフレッシュレート（通常60fps）に一致。
4. **position の "bar:beat:sixteenth" パース**: Tone.js の position 形式をそのまま使い、表示時に 1-indexed に変換。内部的には 0-indexed のまま。
5. **プロジェクト名インライン編集**: `<span>` をクリックで `<input>` に切り替え、blur/Enter で確定、Escape でキャンセル。`setProjectTitle` は useProject から既に公開済みなので Toolbar に `onTitleChange` コールバックを通すだけ。
