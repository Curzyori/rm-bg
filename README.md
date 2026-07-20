<p align="center"><img src="images/home-en-desktop.png" width="600" alt="Desktop Preview" /></p>

<p align="center"><img src="images/logo.png" width="120" alt="RM-BG Logo" /></p>

<h1 align="center">RM-BG + Watermark</h1>

<p align="center">Remove photo background and strip Gemini / NotebookLM watermarks - 100% in your browser, free.</p>

<p align="center">
  <a href="https://github.com/Curzyori/rm-bg"><img src="https://img.shields.io/github/stars/Curzyori/rm-bg?style=flat&label=Stars" alt="Stars" /></a>
  <a href="https://github.com/Curzyori/rm-bg/network/members"><img src="https://img.shields.io/github/forks/Curzyori/rm-bg?style=flat&label=Forks" alt="Forks" /></a>
  <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Curzyori/rm-bg?style=flat&label=License" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-web-blue?style=flat&label=Platform" alt="Platform" />
</p>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#key-features">Key Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#preview">Preview</a> ·
  <a href="#support">Support</a> ·
  <a href="#license">License</a>
</p>

<p align="center">🌐 Language: <strong>🇺🇸 EN</strong> · <a href="README_ID.md">🇮🇩 ID</a> · <a href="README_CN.md">🇨🇳 CN</a> · <a href="README_JP.md">🇯🇵 JP</a></p>

---

## <a id="why"></a>Why

AI image tools (Gemini, NotebookLM) stamp watermarks on exported images. And sometimes you just want a clean cutout with no background. This tool does both locally, in one click, with zero uploads and zero cost.

## <a id="key-features"></a>Key Features

- **Background removal** - on-device ISNet model, no server.
- **Gemini watermark removal** - strips the AI watermark layer.
- **NotebookLM watermark removal** - separate variant supported.
- **Fully client-side** - your image never leaves the browser.
- **Multilingual UI** - EN / ID / CN / JP with one-click switch.
- **Dark / light theme** - opt-in toggle, persisted.
- **Free, no account, no limits.**

## <a id="tech-stack"></a>Tech Stack

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- Custom canvas-based watermark engine
- Vanilla JS, zero framework

## <a id="quick-start"></a>Quick Start

Try it live (recommended):

<p align="center"><a href="https://rm-bg.curzy.dev/">rm-bg.curzy.dev</a></p>

Or run locally:

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

Then open the printed localhost URL.

## <a id="installation"></a>Installation

Build from source (Node 18+):

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run build
npm run preview
```

Output is a static `dist/` folder deployable to any static host (Vercel config included).

## <a id="preview"></a>Preview

<div align="center">

| Home | Before / After |
|------|----------------|
| <img src="images/home-en-desktop.png" width="250" alt="Home" /> | <img src="images/before-after-en-desktop.png" width="250" alt="Before and after" /> |

</div>

## <a id="support"></a>☕ Support

If you find this project useful, please consider giving it a ⭐ Star or 🍴 Forking it to show support and keep me motivated to build more exciting open-source projects! Every single star and fork means a lot.

<a href="https://donate.curzy.dev/">Support this project by buying me a coffee! 💝</a>

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>License

MIT - see <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a>.
