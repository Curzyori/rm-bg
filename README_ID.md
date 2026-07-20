<p align="center"><img src="images/home-en-desktop.png" width="600" alt="Desktop Preview" /></p>

<p align="center"><img src="images/logo.png" width="120" alt="Logo RM-BG" /></p>

<h1 align="center">RM-BG + Watermark</h1>

<p align="center">Hapus background foto dan strip watermark Gemini / NotebookLM - 100% di browser, gratis.</p>

<p align="center">
  <a href="https://github.com/Curzyori/rm-bg"><img src="https://img.shields.io/github/stars/Curzyori/rm-bg?style=flat&label=Stars" alt="Stars" /></a>
  <a href="https://github.com/Curzyori/rm-bg/network/members"><img src="https://img.shields.io/github/forks/Curzyori/rm-bg?style=flat&label=Forks" alt="Forks" /></a>
  <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Curzyori/rm-bg?style=flat&label=License" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-web-blue?style=flat&label=Platform" alt="Platform" />
</p>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#key-features">Fitur</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#installation">Instalasi</a> ·
  <a href="#preview">Preview</a> ·
  <a href="#support">Support</a> ·
  <a href="#license">Lisensi</a>
</p>

<p align="center">🌐 Bahasa: <a href="README.md">🇺🇸 EN</a> · <strong>🇮🇩 ID</strong> · <a href="README_CN.md">🇨🇳 CN</a> · <a href="README_JP.md">🇯🇵 JP</a></p>

---

## <a id="why"></a>Why

Tool AI pembuat gambar (Gemini, NotebookLM) menaruh watermark di gambar hasil export. Dan terkadang kita cuma mau foto tanpa background. Tool ini menyelesaikan keduanya secara lokal, satu klik, tanpa upload dan tanpa biaya.

## <a id="key-features"></a>Fitur Utama

- **Hapus background** - model ISNet on-device, tanpa server.
- **Hapus watermark Gemini** - strip lapisan watermark AI.
- **Hapus watermark NotebookLM** - varian terpisah didukung.
- **Fully client-side** - gambar tidak pernah keluar dari browser.
- **UI multilingual** - EN / ID / CN / JP dengan satu klik.
- **Tema dark / light** - toggle opt-in, tersimpan.
- **Gratis, tanpa akun, tanpa limit.**

## <a id="tech-stack"></a>Tech Stack

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- Watermark engine berbasis canvas custom
- Vanilla JS, tanpa framework

## <a id="quick-start"></a>Quick Start

Coba langsung (recommended):

<p align="center"><a href="https://rm-bg.curzy.dev/">rm-bg.curzy.dev</a></p>

Atau jalankan lokal:

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

Lalu buka URL localhost yang tercetak.

## <a id="installation"></a>Instalasi

Build dari source (Node 18+):

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run build
npm run preview
```

Output berupa folder statis `dist/` yang bisa di-deploy ke host statis mana pun (config Vercel sudah disertakan).

## <a id="preview"></a>Preview

<div align="center">

| Home | Before / After |
|------|----------------|
| <img src="images/home-en-desktop.png" width="250" alt="Home" /> | <img src="images/before-after-en-desktop.png" width="250" alt="Before dan after" /> |

</div>

## <a id="support"></a>☕ Support

Jika Anda merasa project ini bermanfaat, mohon pertimbangkan untuk memberikan ⭐ Star atau melakukan 🍴 Fork untuk menunjukkan dukungan dan membuat saya lebih semangat lagi membuat project open-source yang menarik ke depannya! Setiap star dan fork sangat berharga bagi developer.

<a href="https://donate.curzy.dev/">Dukung project ini dengan traktir kopi! 💝</a>

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>Lisensi

MIT - lihat <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a>.
