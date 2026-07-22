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
  🌐 In 4+ languages —
  <a href="README.md"><b>🇺🇸 EN</b></a> ·
  <a href="README_ID.md">🇮🇩 ID</a> ·
  <a href="README_CN.md">🇨🇳 CN</a> ·
  <a href="README_JP.md">🇯🇵 JP</a>
</p>

---

## <a id="why"></a>🕒 Why RM-BG?

Remove image background and strip Gemini / NotebookLM watermarks locally in your browser. Perfect for cleaning up AI-generated assets, creating transparent graphics, or isolating products. Works completely on-device — no images are ever uploaded to a server.

|                              |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| ✅ **Background Removal**    | On-device ISNet model runs locally in your browser |
| ✅ **Gemini Watermark**       | Strips visible AI watermarks using canvas extraction |
| ✅ **NotebookLM Watermark**   | Separate support for NotebookLM image export format |
| ✅ **100% Client-Side**       | Zero servers, zero uploads — absolute privacy |
| ✅ **Fully Free & Unlimited** | No credits, no accounts, no limits |

## <a id="key-features"></a>🎯 Key Features

| Feature | Status | Description |
| :--- | :---: | :--- |
| **Background Removal** | ✅ | Standard background cutout via ISNet model |
| **Gemini Watermark** | ✅ | Strip SynthID watermark from Gemini exports |
| **NotebookLM Watermark** | ✅ | Strip footer watermark from NotebookLM exports |
| **100% Client-Side** | ✅ | Processing happens in-page, no network required |
| **Multi-Language UI** | ✅ | EN, ID, CN, JP with one-click selector |
| **Dark/Light Theme** | ✅ | Persistent theme switcher |

## <a id="tech-stack"></a>🛠️ Tech Stack

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- Custom canvas-based watermark engine
- Vanilla JS, zero framework

## <a id="architecture"></a>🏗️ Architecture

```
rm-bg/
├── index.html            # Landing & image BG removal
├── video.html            # Video BG removal page
├── src/
│   ├── main.js           # Image module UI + engine init
│   ├── video-main.js     # Video module UI + engine init
│   └── lib/gemini-wm/    # Watermark removal engine
│       ├── core/          # Detection pipeline, processing
│       ├── video/         # Veo AI video watermark detection
│       ├── sdk/           # Browser & Node SDK
│       └── workers/       # Background web workers
├── public/
│   ├── logo.png
│   └── models/           # ONNX denoising models (FDCNN)
├── images/               # README screenshots
├── vite.config.js
└── package.json
```

## <a id="quick-start"></a>🚀 Quick Start

Open the app directly in your browser:

<p align="center"><a href="https://rm-bg.curzy.dev/"><strong>🌐 rm-bg.curzy.dev</strong></a></p>

## <a id="installation"></a>📦 Installation

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

## <a id="preview"></a>🖼️ Preview

<div align="center">

| Home | Before / After |
|------|----------------|
| <img src="images/home-en-desktop.png" width="250" alt="Home" /> | <img src="images/before-after-en-desktop.png" width="250" alt="Before and after" /> |

</div>

## <a id="support"></a>☕ Support

If you find this project useful, please consider giving it a ⭐ Star or 🍴 Forking it to show support and keep me motivated to build more exciting open-source projects! Every single star and fork means a lot.

Your donations keep my projects free and open source. Every contribution matters, and your support helps me continue building exciting open-source projects in the future.

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>⚖️ License

MIT - see <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a>.

Note: `@imgly/background-removal` dependency is AGPL-3.0 licensed. See <a href="https://github.com/imgly/background-removal-js">imgly/background-removal-js</a>.

<p align="center">
  <sub>Built with passion as the 20th project of the 50 Projects Challenge by **@Curzyori**</sub>
</p>
