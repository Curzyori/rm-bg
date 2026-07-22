<p align="center"><img src="images/home-en-desktop.png" width="600" alt="Desktop Preview" /></p>

<p align="center"><img src="images/logo.png" width="120" alt="RM-BG Logo" /></p>

<h1 align="center">RM-BG + Watermark</h1>
<p align="center">
  <strong>Web Utility to Remove Background & Strip AI Watermarks</strong>
</p>

<p align="center">
  <a href="https://rm-bg.curzy.dev/"><strong>🌐 Live Website</strong></a>
</p>

<div align="center">

  <a href="https://github.com/Curzyori/rm-bg"><img src="https://img.shields.io/github/stars/Curzyori/rm-bg?style=for-the-badge&color=374151" alt="Stars" /></a>
  <a href="https://github.com/Curzyori/rm-bg/network/members"><img src="https://img.shields.io/github/forks/Curzyori/rm-bg?style=for-the-badge&color=374151" alt="Forks" /></a>
  <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Curzyori/rm-bg?style=for-the-badge&color=374151" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-web-blue?style=for-the-badge" alt="Platform" />

</div>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#key-features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#preview">Preview</a> ·
  <a href="#support">Support</a> ·
  <a href="#license">License</a>
</p>

<p align="center">
  🌐 4+ 言語に対応 —
  <a href="README.md">🇺🇸 EN</a> ·
  <a href="README_ID.md">🇮🇩 ID</a> ·
  <a href="README_CN.md">🇨🇳 CN</a> ·
  <a href="README_JP.md"><b>🇯🇵 JP</b></a>
</p>

---

## <a id="why"></a>🕒 なぜ RM-BG なのか？

ブラウザ上でローカルに画像の背景を削除し、Gemini / NotebookLM の透かしを除去します。AI 生成アセットのクリーンアップ、背景透過画像の作成、製品の切り抜きに最適です。完全にデバイス上で動作します——画像がサーバーにアップロードされることはありません。

|                              |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| ✅ **背景削除**              | オンデバイスの ISNet モデルがブラウザ上で直接動作 |
| ✅ **Gemini 透かし**          | canvas 抽出技術を使用して AI 透かしを除去 |
| ✅ **NotebookLM 透かし**      | NotebookLM 画像エクスポート形式の個別サポート |
| ✅ **100% クライアント側**     | サーバ不要、アップロード不要 — 完全なプライバシー |
| ✅ **完全無料・無制限**       | クレジット不要、アカウント不要、制限なし |

## <a id="key-features"></a>🎯 主な機能

| 機能 | ステータス | 説明 |
| :--- | :---: | :--- |
| **背景削除** | ✅ | ISNet モデルによる標準的な背景切り抜き |
| **Gemini 透かし** | ✅ | Gemini エクスポートから SynthID 透かしを除去 |
| **NotebookLM 透かし** | ✅ | NotebookLM エクスポートからフッター透かしを除去 |
| **100% クライアント側** | ✅ | 処理はページ内で行われ、通信は不要 |
| **多言語 UI** | ✅ | ワンクリックで EN, ID, CN, JP を切り替え |
| **ダーク/ライトテーマ** | ✅ | 保存可能なテーマ切り替えトグル |

## <a id="tech-stack"></a>🛠️ 技術スタック

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- カスタム canvas ベース透かしエンジン
- バニラ JS、フレームワークなし

## <a id="architecture"></a>🏗️ アーキテクチャ

```
rm-bg/
├── index.html            # ランディング & 画像背景削除
├── video.html            # 動画背景削除ページ
├── src/
│   ├── main.js           # 画像モジュール UI + エンジン初期化
│   ├── video-main.js     # 動画モジュール UI + エンジン初期化
│   └── lib/gemini-wm/    # 透かし除去エンジン
│       ├── core/          # 検出パイプライン、処理
│       ├── video/         # Veo AI 動画透かし検出
│       ├── sdk/           # ブラウザ & Node SDK
│       └── workers/       # バックグラウンド Web Worker
├── public/
│   ├── logo.png
│   └── models/           # ONNX ノイズ除去モデル (FDCNN)
├── images/               # README スクリーンショット
├── vite.config.js
└── package.json
```

## <a id="quick-start"></a>🚀 クイックスタート

ブラウザで直接開く：

<p align="center"><a href="https://rm-bg.curzy.dev/"><strong>🌐 rm-bg.curzy.dev</strong></a></p>

## <a id="installation"></a>📦 インストール

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

## <a id="preview"></a>🖼️ プレビュー

<div align="center">

| ホーム | 処理前後 |
|--------|----------|
| <img src="images/home-en-desktop.png" width="250" alt="ホーム" /> | <img src="images/before-after-en-desktop.png" width="250" alt="処理前後" /> |

</div>

## <a id="support"></a>☕ サポート

このプロジェクトが役に立った場合は、⭐ Star を付けるか 🍴 Fork することを検討してください。開発の励みになり、今後より魅力的なオープンソースプロジェクトを作成するモチベーションになります！1つのスターやフォークが開発者にとって非常に価値があります。

ご寄付により、このプロジェクトを無料でオープンソースに維持できます。皆様のご支援が力になり、今後も魅力的なオープンソースプロジェクトを開発し続ける原動力となります。

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>⚖️ ライセンス

MIT - <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a> を参照。

注：`@imgly/background-removal` 依存関係は AGPL-3.0 ライセンスです。詳細は <a href="https://github.com/imgly/background-removal-js">imgly/background-removal-js</a> をご覧ください。

<p align="center">
  <sub>50 Projects Challenge の20番目のプロジェクトとして、**@Curzyori** が情熱を込めて開発</sub>
</p>
