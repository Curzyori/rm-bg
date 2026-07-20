<p align="center"><img src="images/home-en-desktop.png" width="600" alt="Desktop Preview" /></p>

<p align="center"><img src="images/logo.png" width="120" alt="RM-BG Logo" /></p>

<h1 align="center">RM-BG + Watermark</h1>

<p align="center">去除照片背景并清除 Gemini / NotebookLM 水印 - 完全在浏览器中运行，免费。</p>

<p align="center">
  <a href="https://github.com/Curzyori/rm-bg"><img src="https://img.shields.io/github/stars/Curzyori/rm-bg?style=flat&label=Stars" alt="Stars" /></a>
  <a href="https://github.com/Curzyori/rm-bg/network/members"><img src="https://img.shields.io/github/forks/Curzyori/rm-bg?style=flat&label=Forks" alt="Forks" /></a>
  <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Curzyori/rm-bg?style=flat&label=License" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-web-blue?style=flat&label=Platform" alt="Platform" />
</p>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#key-features">功能</a> ·
  <a href="#tech-stack">技术栈</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#installation">安装</a> ·
  <a href="#preview">预览</a> ·
  <a href="#support">支持</a> ·
  <a href="#license">许可证</a>
</p>

<p align="center">🌐 语言: <a href="README.md">🇺🇸 EN</a> · <a href="README_ID.md">🇮🇩 ID</a> · <strong>🇨🇳 CN</strong> · <a href="README_JP.md">🇯🇵 JP</a></p>

---

## <a id="why"></a>Why

AI 图像工具（Gemini、NotebookLM）会在导出的图片上添加水印。有时你只是想要一张没有背景的干净图片。本工具在本地一次性完成这两件事，无需上传，完全免费。

## <a id="key-features"></a>主要功能

- **背景去除** - 本地 ISNet 模型，无需服务器。
- **Gemini 水印去除** - 清除 AI 水印图层。
- **NotebookLM 水印去除** - 支持独立变体。
- **完全客户端** - 图片永远不会离开浏览器。
- **多语言界面** - EN / ID / CN / JP，一键切换。
- **深色 / 浅色主题** - 可选切换，自动保存。
- **免费，无需账号，无限制。**

## <a id="tech-stack"></a>技术栈

- Vite 8 (rolldown)
- `@imgly/background-removal` (ONNX WebGPU/WASM)
- 基于 canvas 的自研水印引擎
- 原生 JS，无框架

## <a id="quick-start"></a>快速开始

在线试用（推荐）：

<p align="center"><a href="https://rm-bg.curzy.dev/">rm-bg.curzy.dev</a></p>

或本地运行：

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run dev
```

然后打开终端中显示的 localhost 地址。

## <a id="installation"></a>安装

从源码构建（Node 18+）：

```bash
git clone https://github.com/Curzyori/rm-bg.git
cd rm-bg
npm install
npm run build
npm run preview
```

输出为静态 `dist/` 文件夹，可部署到任意静态托管（已包含 Vercel 配置）。

## <a id="preview"></a>预览

<div align="center">

| 首页 | 处理前后 |
|------|----------|
| <img src="images/home-en-desktop.png" width="250" alt="首页" /> | <img src="images/before-after-en-desktop.png" width="250" alt="处理前后" /> |

</div>

## <a id="support"></a>☕ 支持

如果你觉得这个项目对你有帮助，请考虑给一个 ⭐ Star 或 🍴 Fork 以示支持，这能让我更有动力继续开发更多有趣的开源项目！每一个 Star 和 Fork 对开发者来说都无比珍贵。

<a href="https://donate.curzy.dev/">请我喝杯咖啡来支持这个项目！💝</a>

<a href="https://donate.curzy.dev/">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

## <a id="license"></a>许可证

MIT - 详见 <a href="https://github.com/Curzyori/rm-bg/blob/main/LICENSE">LICENSE</a>。
