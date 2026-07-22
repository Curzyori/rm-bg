import { removeBackground, preload } from '@imgly/background-removal';
import { createWatermarkEngine } from './lib/gemini-wm/sdk/browser.js';

const $ = (id) => document.getElementById(id);
const drop = $('drop'), fileInput = $('file'), bar = $('bar'), barWrap = $('barWrap');
const statusEl = $('status'), grid = $('grid'), beforeImg = $('before'), afterImg = $('after');
const download = $('download');
const progressSection = $('progressSection');

const MAX = 20 * 1024 * 1024;
let currentBlob = null;
let isProcessing = false;

// i18n Strings
const i18n = {
  en: {
    subtitle: "Upload 1 photo → remove background + Gemini/NotebookLM watermark. In-browser, free.",
    upload_main: "Click or drop image (PNG/JPG/WebP)",
    upload_sub: "Max ~20MB. Processed locally, files are not uploaded.",
    before_cap: "Before",
    after_cap: "After",
    download: "Download PNG",
    preloading: "Preloading model...",
    removing_bg: "Removing background...",
    removing_wm: "Stripping watermark...",
    done: "Done ✅",
    err_already: "An image has already been uploaded or is processing. Please refresh to upload a new one.",
    err_type: "Unsupported format. PNG/JPG/WebP only.",
    err_size: "File too large (max 20MB).",
    err_fail: "Failed: ",
    loading_model: "Loading background removal model...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    opt_bg: "Remove Background",
    opt_gemini: "Remove Gemini Watermark",
    opt_notebook: "Remove NotebookLM Watermark",
    meta_license: "MIT License",
    meta_version: "Version 1.0.0",
    license_url: "https://github.com/curzyori/rm-bg#license",
    nav_image: "Image",
    nav_video: "Video"
  },
  id: {
    subtitle: "Upload 1 foto → hapus background + watermark Gemini/NotebookLM. Semua di browser, gratis.",
    upload_main: "Klik atau drop gambar (PNG/JPG/WebP)",
    upload_sub: "Max ~20MB. Diproses lokal, file tidak diupload.",
    before_cap: "Sebelum",
    after_cap: "Sesudah",
    download: "Download PNG",
    preloading: "Preloading model...",
    removing_bg: "Menghapus background...",
    removing_wm: "Menghapus watermark...",
    done: "Selesai ✅",
    err_already: "Gambar sudah diupload atau sedang diproses. Silakan refresh untuk upload gambar baru.",
    err_type: "Format tidak didukung. PNG/JPG/WebP saja.",
    err_size: "File terlalu besar (max 20MB).",
    err_fail: "Gagal: ",
    loading_model: "Memuat model background removal...",
    lnk_github: "GitHub",
    lnk_donate: "Donasi",
    opt_bg: "Hapus Background",
    opt_gemini: "Hapus Watermark Gemini",
    opt_notebook: "Hapus Watermark NotebookLM",
    meta_license: "Lisensi MIT",
    meta_version: "Versi 1.0.0",
    license_url: "https://github.com/Curzyori/rm-bg/blob/main/README_ID.md#license",
    nav_image: "Gambar",
    nav_video: "Video"
  },
  zh: {
    subtitle: "上传1张照片 → 自动去除背景 + 移除双重水印 (Gemini/NotebookLM)。纯本地浏览器处理，完全免费。",
    upload_main: "点击或拖拽图片至此 (PNG/JPG/WebP)",
    upload_sub: "文件最大 20MB。本地处理，不会上传到服务器。",
    before_cap: "处理前",
    after_cap: "处理后",
    download: "下载 PNG",
    preloading: "正在预载模型...",
    removing_bg: "正在去除背景...",
    removing_wm: "正在移除水印...",
    done: "处理完成 ✅",
    err_already: "已上传或正在处理图片。请刷新页面以上传新图片。",
    err_type: "不支持的文件格式。仅支持 PNG/JPG/WebP。",
    err_size: "文件太大 (最大 20MB)。",
    err_fail: "处理失败: ",
    loading_model: "正在加载背景消除模型...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    opt_bg: "去除背景",
    opt_gemini: "移除 Gemini 水印",
    opt_notebook: "移除 NotebookLM 水印",
    meta_license: "MIT 许可证",
    meta_version: "版本 1.0.0",
    license_url: "https://github.com/Curzyori/rm-bg/blob/main/README_CN.md#license",
    nav_image: "图片",
    nav_video: "视频"
  },
  ja: {
    subtitle: "写真を1枚アップロード → 背景消去 + 二重透かし (Gemini/NotebookLM) を一括クリア。すべてブラウザ内で完結、完全無料。",
    upload_main: "クリックまたはドラッグ＆ドロップ (PNG/JPG/WebP)",
    upload_sub: "最大 20MB。ローカルで処理されるため、ファイルはアップロードされません。",
    before_cap: "処理前",
    after_cap: "処理後",
    download: "PNGをダウンロード",
    preloading: "モデルを事前ロード中...",
    removing_bg: "背景を消去中...",
    removing_wm: "透かしを除去中...",
    done: "完了 ✅",
    err_already: "すでに画像がアップロードされているか、処理中です。新しい画像をアップロードするにはページを更新してください。",
    err_type: "サポートされていない形式です。PNG/JPG/WebPのみ対応。",
    err_size: "ファイルサイズが大きすぎます (最大20MB)。",
    err_fail: "エラー: ",
    loading_model: "背景消去モデルを読み込み中...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    opt_bg: "背景を消去",
    opt_gemini: "Geminiの透かしを除去",
    opt_notebook: "NotebookLMの透かしを除去",
    meta_license: "MITライセンス",
    meta_version: "バージョン 1.0.0",
    license_url: "https://github.com/Curzyori/rm-bg/blob/main/README_JP.md#license",
    nav_image: "画像",
    nav_video: "動画"
  }
};

let currentLang = localStorage.getItem('rm-bg-lang') || 'en';

function setLanguage(lang) {
  if (!i18n[lang]) lang = 'en';
  currentLang = lang;
  localStorage.setItem('rm-bg-lang', lang);
  document.documentElement.lang = lang;

  // Apply strings
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });

  // Update switcher UI
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update license link for current locale
  const licenseLink = document.getElementById('licenseLink');
  if (licenseLink && i18n[lang].license_url) {
    licenseLink.href = i18n[lang].license_url;
  }
}

function t(key) {
  return i18n[currentLang][key] || i18n['en'][key] || key;
}

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (isErr ? ' err' : '');
  progressSection.classList.toggle('active', !!msg);
}

function setProgress(pct) {
  progressSection.classList.add('active');
  bar.style.width = pct + '%';
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
    img.src = url;
  });
}

async function canvasToBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise((res, rej) => {
    canvas.toBlob((b) => b ? res(b) : rej(new Error('encode failed')), 'image/png');
  });
}

async function handleFile(file) {
  if (!file) return;
  // ponytail: single-image app, block overwrite + concurrent runs, alert in current lang
  if (isProcessing || currentBlob) { alert(t('err_already')); return; }
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setStatus(t('err_type'), true); return; }
  if (file.size > MAX) { setStatus(t('err_size'), true); return; }

  const doBg = $('optBg').checked;
  const doGemini = $('optGemini').checked;
  const doNotebook = $('optNotebook').checked;
  if (!doBg && !doGemini && !doNotebook) {
    setStatus('Select at least one option', true);
    return;
  }

  isProcessing = true;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outName = 'rm-bg-' + baseName + '.png';

  grid.style.display = 'none';
  download.style.display = 'none';
  barWrap.style.display = 'block';
  setProgress(5);

  try {
    beforeImg.src = URL.createObjectURL(file);

    // Step 1: remove background (optional)
    let sourceBlob = file;
    if (doBg) {
      setStatus(t('removing_bg'));
      sourceBlob = await removeBackground(file, {
        model: 'isnet_fp16',
        output: { format: 'image/png' },
        progress: (key, current, total) => {
          if (total) setProgress(5 + Math.round((current / total) * 55));
        },
      });
      setProgress(60);
    }

    // Step 2: strip watermark engine (only if Gemini or NotebookLM selected)
    let outBlob;
    if (doGemini || doNotebook) {
      setStatus(t('removing_wm'));
      const img = await blobToImage(sourceBlob);
      const engine = await createWatermarkEngine();
      const canvas = await engine.removeWatermarkFromImage(img);
      setProgress(90);
      outBlob = await canvasToBlob(canvas);
    } else {
      // only bg, no watermark
      outBlob = sourceBlob;
      setProgress(90);
    }

    afterImg.src = URL.createObjectURL(outBlob);
    currentBlob = outBlob;
    isProcessing = false;

    grid.style.display = 'flex';
    download.href = URL.createObjectURL(outBlob);
    download.download = outName;
    download.style.display = 'inline-block';
    setProgress(100);
    setStatus(t('done'));
  } catch (e) {
    console.error(e);
    isProcessing = false;
    currentBlob = null;
    setStatus(t('err_fail') + (e?.message || e), true);
    setProgress(0);
  }
}

// Click and Drag events
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]); });

// Language switcher clicks
document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLanguage(btn.getAttribute('data-lang'));
  });
});

// Theme switcher
function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}
function applyTheme(theme) {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme(getInitialTheme());
$('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

// Init language
setLanguage(currentLang);

// GitHub star count (realtime)
const GH_REPO = 'curzyori/rm-bg';
const ghNum = $('ghNum');
(async () => {
  try {
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('gh');
    const { stargazers_count } = await r.json();
    ghNum.textContent = String(stargazers_count);
  } catch { /* stay 0 */ }
})();

// Warm up model on page load so first upload doesn't wait for download
setStatus(t('preloading'));
preload({ model: 'isnet_fp16' }).then(() => { setStatus(''); }).catch(() => { /* silent */ });
