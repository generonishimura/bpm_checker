# CLAUDE.md

## Project Overview

MP3ファイルのBPM・Key解析をブラウザ内で完結するWebアプリ。サーバー不要。

## Tech Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS v4
- Web Audio API（音声デコード・FFT）
- Vitest（テスト）
- GitHub Pages（デプロイ）

## Commands

```bash
npm run dev        # 開発サーバー起動
npm run build      # ビルド（vue-tsc + vite build）
npx vitest run     # テスト実行
```

## Architecture

```
src/
  domain/           # ドメインロジック（純粋関数、フレームワーク非依存）
    types.ts         # 型定義（AnalysisResult, BpmAnalysis, KeyAnalysis等）
    bpm-detector.ts  # BPM検出（3アルゴリズム: Autocorrelation, Onset, Spectral Flux）
    key-detector.ts  # Key検出（3プロファイル: Krumhansl-Kessler, Temperley, Sha'ath）
    chroma.ts        # クロマベクトル算出
    audio-analyzer.ts # Web Audio APIラッパー（デコード・FFT）
  components/        # Vueコンポーネント
  App.vue            # メインUI（アップロード・解析結果表示）
  main.ts            # エントリポイント
public/
  favicon.svg
  icons.svg
.github/workflows/
  deploy.yml         # GitHub Pages自動デプロイ（main push時）
```

## Key Design Decisions

- ドメインロジック（`src/domain/`）はWeb Audio API以外のフレームワーク依存なし
- BPM: 3アルゴリズムの中央値を採用
- Key: 3プロファイルの多数決を採用
- 信頼度（Confidence）: アルゴリズム間の一致度で High / Medium / Low を判定
- テストは `src/domain/` 内にコロケーション（`*.test.ts`）

## Deploy

`main` ブランチへのpushでGitHub Pagesに自動デプロイ。
ワークフロー: テスト → ビルド → デプロイ
