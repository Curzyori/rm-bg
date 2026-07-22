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
  🌐 Dalam 4+ bahasa —
  <a href="README.md">🇺🇸 EN</a> ·
  <a href="README_ID.md"><b>🇮🇩 ID</b></a> ·
  <a href="README_CN.md">🇨🇳 CN</a> ·
  <a href="README_JP.md">🇯🇵 JP</a>
</p>

---

## <a id="why"></a>🕒 Kenapa RM-BG?

Hapus background gambar dan hilangkan watermark Gemini / NotebookLM secara lokal di browser Anda. Cocok untuk merapikan aset hasil AI, membuat gambar transparan, atau memisahkan objek produk. Berjalan sepenuhnya di perangkat Anda — gambar tidak pernah di-upload ke server.

|                              |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| ✅ **Hapus Background**       | Model ISNet berjalan lokal langsung di browser Anda |
| ✅ **Watermark Gemini**       | Strip watermark AI menggunakan canvas extraction |
| ✅ **Watermark NotebookLM**   | Dukungan terpisah untuk format ekspor gambar NotebookLM |
| ✅ **Watermark Video**        | Hapus watermark teks Gemini & Veo dari video MP4/WebM |
| ✅ **100% Client-Side**       | Tanpa server, tanpa upload — privasi mutlak |
| ✅ **Gratis & Tanpa Batas**   | Tanpa credit, tanpa akun, tanpa limit |

## <a id="key-features"></a>🎯 Fitur Utama

| Fitur | Status | Deskripsi |
| :--- | :---: | :--- |
| **Hapus Background** | ✅ | Potong background menggunakan model ISNet |
| **Watermark Gemini** | ✅ | Hapus watermark SynthID dari ekspor Gemini |
| **Watermark NotebookLM** | ✅ | Hapus watermark footer dari ekspor NotebookLM |
| **Watermark Video** | ✅ | Hapus watermark teks Gemini & Veo dari video MP4/WebM |
| **100% Client-Side** | ✅ | Pemrosesan di dalam halaman, tidak butuh internet |
| **UI Multi-Bahasa** | ✅ | EN, ID, CN, JP dengan satu klik selektor |
| **Tema Dark/Light** | ✅ | Switcher tema yang tersimpan otomatis |

## <a id="tech-stack"></a>🛠️ Tech Stack

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- Watermark engine berbasis canvas custom
- Vanilla JS, tanpa framework

## <a id="architecture"></a>🏗️ Arsitektur

```
rm-bg/
├── index.html            # Landing & hapus background gambar
├── video.html            # Halaman hapus background video
├── src/
│   ├── main.js           # UI modul gambar + inisialisasi engine
│   ├── video-main.js     # UI modul video + inisialisasi engine
│   └── lib/gemini-wm/    # Engine watermark removal
│       ├── core/          # Pipeline deteksi, processing
│       ├── video/         # Deteksi watermark video Veo AI
│       ├── sdk/           # SDK Browser & Node
│       └── workers/       # Web workers background
├── public/
│   ├── logo.png
│   └── models/           # Model ONNX denoising (FDCNN)
├── images/               # Screenshot README
├── vite.config.js
└── package.json
```

## <a id="quick-start"></a>🚀 Quick Start

Buka aplikasi langsung di browser:

<p align="center"><a href="https://rm-bg.curzy.dev/"><strong>🌐 rm-bg.curzy.dev</strong></a></p>

## <a id="installation"></a>📦 Instalasi

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
| <img src="images/home-en-desktop.png" width="250" alt="Home" /> | <img src="images/before-after-en-desktop.png" width="250" alt="Before dan after" /> |

</div>

## <a id="support"></a>☕ Support

Jika Anda merasa project ini bermanfaat, mohon pertimbangkan untuk memberikan ⭐ Star atau melakukan 🍴 Fork untuk menunjukkan dukungan dan membuat saya lebih semangat lagi membuat project open-source yang menarik ke depannya! Setiap star dan fork sangat berharga bagi developer.

Donasi Anda menjaga proyek ini tetap gratis dan open-source. Setiap kontribusi sangat berarti, dan dukungan Anda membantu saya untuk terus membuat proyek open-source menarik ke depannya.

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>⚖️ Lisensi

MIT - lihat <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a>.

Catatan: dependensi `@imgly/background-removal` dilisensikan AGPL-3.0. Lihat <a href="https://github.com/imgly/background-removal-js">imgly/background-removal-js</a>.

<p align="center">
  <sub>Dibuat dengan dedikasi sebagai project ke-20 dari 50 Projects Challenge oleh **@Curzyori**</sub>
</p>
