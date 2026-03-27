# BPM Checker

MP3ファイルをアップロードして、BPM・Key・Alt Keyを解析するWebアプリ。
サーバー不要、ブラウザ内で完結。

**Demo**: https://generonishimura.github.io/bpm_checker/

## 機能

- MP3ファイルのドラッグ＆ドロップまたはクリックでアップロード
- **BPM検出** — 3つのアルゴリズムで判定、中央値を採用
  - Autocorrelation / Onset Interval / Spectral Flux
- **Key検出** — 3つのプロファイルで判定、多数決を採用
  - Krumhansl-Kessler / Temperley / Sha'ath
- **信頼度表示** — アルゴリズムの一致度に基づく（High / Medium / Low）
- Alt Key（相対調）の表示

## 技術スタック

- Vue 3 + TypeScript + Vite
- Tailwind CSS v4
- Web Audio API（音声デコード・FFT）
- Vitest（テスト）
- GitHub Actions → GitHub Pages（自動デプロイ）

## 開発

```bash
npm install
npm run dev
```

## テスト

```bash
npx vitest run
```

## ビルド

```bash
npm run build
```

## デプロイ

`main` ブランチへのpushで GitHub Pages に自動デプロイされる。
