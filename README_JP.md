<p align="center"><img src="images/home-en-desktop.png" width="600" alt="Desktop Preview" /></p>

<p align="center"><img src="images/logo.png" width="120" alt="RM-BG Logo" /></p>

<h1 align="center">RM-BG + Watermark</h1>

<p align="center">写真の背景削除と Gemini / NotebookLM 透かし除去 - すべてブラウザ内で、無料。</p>

<p align="center">
  <a href="https://github.com/Curzyori/rm-bg"><img src="https://img.shields.io/github/stars/Curzyori/rm-bg?style=flat&label=Stars" alt="Stars" /></a>
  <a href="https://github.com/Curzyori/rm-bg/network/members"><img src="https://img.shields.io/github/forks/Curzyori/rm-bg?style=flat&label=Forks" alt="Forks" /></a>
  <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Curzyori/rm-bg?style=flat&label=License" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-web-blue?style=flat&label=Platform" alt="Platform" />
</p>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#key-features">機能</a> ·
  <a href="#tech-stack">技術スタック</a> ·
  <a href="#quick-start">クイックスタート</a> ·
  <a href="#installation">インストール</a> ·
  <a href="#preview">プレビュー</a> ·
  <a href="#support">サポート</a> ·
  <a href="#license">ライセンス</a>
</p>

<p align="center">🌐 言語: <a href="README.md">🇺🇸 EN</a> · <a href="README_ID.md">🇮🇩 ID</a> · <a href="README_CN.md">🇨🇳 CN</a> · <strong>🇯🇵 JP</strong></p>

---

## <a id="why"></a>Why

AI 画像ツール（Gemini、NotebookLM）は書き出した画像に透かしを押します。また、背景のない綺麗な切り抜きが欲しいだけの場合も。本ツールはアップロード不要・無料で、この両方をローカルでワンクリック処理します。

## <a id="key-features"></a>主な機能

- **背景削除** - オンデバイスの ISNet モデル、サーバ不要。
- **Gemini 透かし除去** - AI 透かしレイヤーを除去。
- **NotebookLM 透かし除去** - 別バリアントに対応。
- **完全クライアント側** - 画像がブラウザを離れることはありません。
- **多言語 UI** - EN / ID / CN / JP をワンクリック切替。
- **ダーク / ライトテーマ** - 選択式トグル、保存されます。
- **無料、アカウント不要、制限なし。**

## <a id="tech-stack"></a>技術スタック

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- カスタム canvas ベース透かしエンジン
- バニラ JS、フレームワークなし

## <a id="quick-start"></a>クイックスタート

オンラインで試す（推奨）：

<p align="center"><a href="https://rm-bg.curzy.dev/">rm-bg.curzy.dev</a></p>

またはローカルで実行：

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

その後、表示された localhost URL を開きます。

## <a id="installation"></a>インストール

ソースからビルド（Node 18+）：

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run build
npm run preview
```

出力は静的 `dist/` フォルダで、任意の静的ホスティングにデプロイ可能（Vercel 設定付属）。

## <a id="preview"></a>プレビュー

<div align="center">

| ホーム | 処理前後 |
|--------|----------|
| <img src="images/home-en-desktop.png" width="250" alt="ホーム" /> | <img src="images/before-after-en-desktop.png" width="250" alt="処理前後" /> |

</div>

## <a id="support"></a>☕ サポート

このプロジェクトが役に立った場合は、⭐ Star を付けるか 🍴 Fork することを検討してください。開発の励みになり、今後より魅力的なオープンソースプロジェクトを作成するモチベーションになります！1つのスターやフォークが開発者にとって非常に価値があります。

<a href="https://donate.curzy.dev/">コーヒーをおごってプロジェクトを応援してください！💝</a>

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>ライセンス

MIT - <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a> を参照。
