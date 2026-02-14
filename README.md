# Live Scratch

Scratchライクなブロック操作でAV（Audio/Visual）ライブコーディングができるWebアプリケーション。

**https://live-scratch.vercel.app/**

## コンセプト

- **初心者向け** — ブロックを組み合わせるだけでライブコーディングを体験できる
- **上級者向け** — ブロック内部のTone.jsコードを直接編集してカスタマイズできる
- **ブラウザ完結** — インストール不要、Webブラウザからすぐにアクセス可能

## 画面構成

```
┌──────────────────────────────────────────────┐
│  Toolbar  [ ▶ Play ] [ ■ Stop ] [BPM: 120]  │
├──────────────┬───────────────┬───────────────┤
│              │               │               │
│   Blockly    │   p5.js       │  Code Panel   │
│   Editor     │   Canvas      │  (CodeMirror) │
│              │               │               │
├──────────────┴───────────────┴───────────────┤
│  Status Bar                                  │
└──────────────────────────────────────────────┘
```

パネルはドラッグでリサイズ可能。モバイルでは縦方向レイアウトに自動切り替え。

## 機能

### ブロックエディタ

Blocklyベースのビジュアルプログラミング環境。4カテゴリのブロックを組み合わせて音楽とビジュアルを構築する。

**Source（音源）**
- `synth` — シンセサイザー（sine / square / sawtooth / triangle）
- `sampler` — プリセットサンプル（kick / snare / hihat / clap）

**Pattern（パターン）**
- `beat` — ステップシーケンサー（例: `x---x---`）
- `note` — 単音ループ（例: C4）
- `sequence` — メロディシーケンス（例: C4, E4, G4, E4）

**Effect（エフェクト）**
- `reverb` / `delay` / `filter` / `distortion`
- ブロックを繋げてエフェクトチェーンを構築

**Control（制御）**
- `bpm` — テンポ設定
- `loop` — ループ制御

### オーディオリアクティブビジュアル

p5.jsキャンバスでリアルタイムに音に反応するビジュアルを描画。

- **図形**: Circle, Rectangle（位置・サイズ・色を指定）
- **波形/スペクトラム表示**: Waveform, Spectrum
- **カスタムシェーダー**: GLSLフラグメントシェーダー（u_resolution, u_time, u_bass, u_treble）
- **モジュレーション**: 周波数帯域 / 振幅 / ビート検出 / 時間ベースの変調を図形プロパティにマッピング

### コード編集モード

CodeMirrorエディタで、ブロックから生成されたTone.jsコードを直接編集可能。

- トラックブロックを選択してCode Panelを開く
- 編集済みトラックにはカスタムコードバッジを表示
- ブロック変更時にカスタムコード上書きの確認あり
- リセットで元のブロック定義に復元

### カスタムブロック

ユーザー独自のブロックを作成・共有できるシステム。

- ブロック定義（入出力・フィールド）とジェネレータコードを設定
- コミュニティに公開してブロックを共有
- Block Browserから他ユーザーのブロックをインストール

### プロジェクト管理

- Google / GitHub OAuth認証
- プロジェクトの保存・読み込み・削除
- URLによるプロジェクト共有（`/p/:id`）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| UI | React 19 + TypeScript |
| ブロックエディタ | Blockly |
| 音声エンジン | Tone.js (Web Audio API) |
| ビジュアル | p5.js (WebGL) |
| コードエディタ | CodeMirror 6 |
| 認証・DB | Supabase |
| ビルド | Vite |
| ホスティング | Vercel |

## アーキテクチャ

```
Blockly Editor
    ↓  ブロック → JSON中間表現 (IR) に変換
Audio Engine (Tone.js Transport)
    ↓  IR を解釈してビート同期再生
p5.js Canvas
    ↓  オーディオデータを取得してビジュアル描画
```

BPM変更は即座に反映。ブロックの追加・変更・削除は差分検出後にスケジュール更新。

## ローカル開発

### 前提条件

- Node.js 20+
- npm

### セットアップ

```bash
git clone https://github.com/kubotadaichi/LiveScratch.git
cd LiveScratch
npm install
```

### 環境変数

`.env.local` を作成:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

## ライセンス

MIT
