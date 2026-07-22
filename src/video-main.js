import {
    DEFAULT_ADAPTIVE_ALPHA,
    DEFAULT_ALPHA_GAIN,
    DEFAULT_DENOISE_BACKEND,
    DEFAULT_EDGE_DENOISE_STRENGTH,
    DEFAULT_HIGH_QUALITY_CLEANUP,
    DEFAULT_RESIDUAL_CLEANUP_STRENGTH,
    DEFAULT_SAMPLE_COUNT,
    DEFAULT_VIDEO_BITRATE,
    VIDEO_DENOISE_BACKENDS,
    detectGeminiVideoWatermark,
    removeGeminiVideoWatermark
} from './lib/gemini-wm/video/videoExport.js';
import { resolveAllenkFdncnnRuntimeProfile } from './lib/gemini-wm/video/videoDenoiseRuntimePolicy.js';
import { createAllenkFdncnnOnnxRuntime } from './lib/gemini-wm/core/allenkFdncnnOnnxRuntime.js';

const $ = (id) => document.getElementById(id);
const ALLENK_FDNCNN_WASM_PATHS = null;
const ALLENK_FDNCNN_WEBGPU_WASM_PATHS = null;

const state = {
    file: null,
    processedUrl: null,
    running: false,
    jobId: 0
};

const allenkFdncnnRuntimePromises = new Map();

const els = {
    dropzone: $('drop'),
    fileInput: $('file'),
    progressSection: $('progressSection'),
    bar: $('bar'),
    status: $('status'),
    download: $('download'),
    optGemini: $('optGemini'),
    optVeo: $('optVeo'),
    themeToggle: $('themeToggle'),
    infoContainer: $('infoContainer'),
    infoTooltip: $('infoTooltip'),
    infoBtn: $('infoBtn')
};

// Toggle Info Tooltip
if (els.infoBtn && els.infoTooltip) {
    els.infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.infoTooltip.classList.toggle('show');
    });
    document.addEventListener('click', () => {
        els.infoTooltip.classList.remove('show');
    });
}

// --- Multi-language / I18n ---
const i18n = {
    en: {
        nav_image: 'Image',
        nav_video: 'Video',
        subtitle: 'Upload 1 video → remove Gemini/Veo Text watermarks. Entirely in-browser, free.',
        upload_video: 'Click or drop video (MP4/WebM)',
        upload_video_sub: 'Max ~100MB. Processed locally, files never uploaded.',
        opt_gemini_video: 'Remove Gemini Video Watermark',
        opt_veo_video: 'Remove Veo Text Watermark',
        download_video: 'Download MP4',
        loading_ai: 'Loading AI model...',
        detecting: 'Detecting watermark...',
        processing: 'Processing video frames...',
        saving: 'Finalizing video output...',
        done: 'Processing finished! Click download below.',
        err_browser: 'WebCodecs H.264/AVC encoding is not supported in this browser. Please use Chrome or Edge.',
        err_export: 'Video processing failed.',
        lnk_github: 'GitHub',
        lnk_donate: 'Donate',
        meta_license: 'MIT License',
        meta_version: 'Version 1.0.0',
        license_url: 'https://github.com/curzyori/rm-bg#license',
        info_desc_1: 'Processing is done locally on your device using ONNX Runtime (WASM/WebGPU).',
        info_desc_2: 'Depending on your CPU/GPU and video length, frames are processed one by one which might take some time.'
    },
    id: {
        nav_image: 'Gambar',
        nav_video: 'Video',
        subtitle: 'Upload 1 video → hapus watermark Gemini/Veo Text. Semua di browser, gratis.',
        upload_video: 'Klik atau drop video (MP4/WebM)',
        upload_video_sub: 'Max ~100MB. Diproses lokal, file tidak diupload.',
        opt_gemini_video: 'Hapus Watermark Video Gemini',
        opt_veo_video: 'Hapus Watermark Teks Veo',
        download_video: 'Unduh MP4',
        loading_ai: 'Memuat model AI...',
        detecting: 'Mendeteksi watermark...',
        processing: 'Memproses frame video...',
        saving: 'Menyimpan video...',
        done: 'Selesai! Klik unduh di bawah.',
        err_browser: 'Encoding WebCodecs H.264/AVC tidak didukung di browser ini. Gunakan Chrome atau Edge.',
        err_export: 'Gagal memproses video.',
        lnk_github: 'GitHub',
        lnk_donate: 'Donasi',
        meta_license: 'Lisensi MIT',
        meta_version: 'Versi 1.0.0',
        license_url: 'https://github.com/Curzyori/rm-bg/blob/main/README_ID.md#license',
        info_desc_1: 'Pemrosesan dilakukan sepenuhnya di perangkat Anda menggunakan ONNX Runtime (WASM/WebGPU).',
        info_desc_2: 'Tergantung CPU/GPU dan durasi video, frame diproses satu per satu yang bisa memakan waktu.'
    },
    zh: {
        nav_image: '图片',
        nav_video: '视频',
        subtitle: '上传 1 个视频 → 移除 Gemini/Veo 文字水印。完全在浏览器中处理，免费。',
        upload_video: '点击或拖拽视频文件到此 (MP4/WebM)',
        upload_video_sub: '最大 ~100MB。本地处理，视频绝不上传。',
        opt_gemini_video: '移除 Gemini 视频水印',
        opt_veo_video: '移除 Veo 文字水印',
        download_video: '下载 MP4',
        loading_ai: '正在加载 AI 模型...',
        detecting: '正在检测水印...',
        processing: '正在处理视频帧...',
        saving: '正在保存并生成视频...',
        done: '处理完成！请点击下方下载。',
        err_browser: '当前浏览器不支持 WebCodecs H.264/AVC 编码，请使用 Chrome 或 Edge。',
        err_export: '视频处理失败。',
        lnk_github: '开源地址',
        lnk_donate: '赞助支持',
        meta_license: 'MIT 开源协议',
        meta_version: '版本 1.0.0',
        license_url: 'https://github.com/Curzyori/rm-bg/blob/main/README_CN.md#license',
        info_desc_1: '处理是在您的设备上使用 ONNX Runtime (WASM/WebGPU) 本地完成的。',
        info_desc_2: '根据您的 CPU/GPU 和视频长度，帧将一帧一帧进行处理，这可能需要一些时间。'
    },
    ja: {
        nav_image: '画像',
        nav_video: '動画',
        subtitle: '動画をアップロード → Gemini/Veo テキスト透かしを除去。ブラウザ内完結、無料。',
        upload_video: 'クリックまたは動画をドロップ (MP4/WebM)',
        upload_video_sub: '最大 ~100MB。ローカルで処理、ファイルは送信されません。',
        opt_gemini_video: 'Gemini 動画の透かしを除去',
        opt_veo_video: 'Veo テキストの透かしを除去',
        download_video: 'MP4 をダウンロード',
        loading_ai: 'AI モデルを読み込み中...',
        detecting: '透かしを検出中...',
        processing: '動画フレームを処理中...',
        saving: '動画出力を保存中...',
        done: '処理完了！以下からダウンロードしてください。',
        err_browser: 'このブラウザは WebCodecs H.264/AVC エンコードに対応していません。Chrome または Edge を使用してください。',
        err_export: '動画の処理に失敗しました。',
        lnk_github: 'GitHub',
        lnk_donate: '寄付',
        meta_license: 'MIT ライセンス',
        meta_version: 'バージョン 1.0.0',
        license_url: 'https://github.com/Curzyori/rm-bg/blob/main/README_JP.md#license',
        info_desc_1: '処理はすべてお使いのデバイス上で ONNX Runtime (WASM/WebGPU) を用いてローカル実行されます。',
        info_desc_2: 'CPU/GPU や動画の長さに応じて、フレームを1つずつ処理するため、時間がかかる場合があります。'
    }
};

let currentLang = localStorage.getItem('rm-bg-lang') || 'en';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('rm-bg-lang', lang);
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    // Translate elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[lang] && i18n[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = i18n[lang][key];
            } else {
                const span = el.querySelector('span');
                if (span) {
                    span.innerText = i18n[lang][key];
                } else {
                    el.innerText = i18n[lang][key];
                }
            }
        }
    });

    // Update license link for current locale
    const licenseLink = document.getElementById('licenseLink');
    if (licenseLink && i18n[lang] && i18n[lang].license_url) {
        licenseLink.href = i18n[lang].license_url;
    }
}

// Update license link for current locale
const licenseLink = document.getElementById('licenseLink');
if (licenseLink && i18n[currentLang] && i18n[currentLang].license_url) {
    licenseLink.href = i18n[currentLang].license_url;
}

// Lang buttons
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});
setLanguage(currentLang);

// GitHub star count (realtime)
const GH_REPO = 'curzyori/rm-bg';
const ghNum = document.getElementById('ghNum');
(async () => {
    try {
        const r = await fetch(`https://api.github.com/repos/${GH_REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error('gh');
        const { stargazers_count } = await r.json();
        if (ghNum) ghNum.textContent = String(stargazers_count);
    } catch { /* stay 0 */ }
})();

// --- Theme Management ---
function updateTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    }
}
els.themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    updateTheme(isLight ? 'dark' : 'light');
});
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
updateTheme(savedTheme);

// --- ONNX Runtime Loader ---
function setStatus(message, isError = false) {
    els.status.textContent = message || '';
    els.status.className = 'status' + (isError ? ' err' : '');
}

function isLikelyJavascriptMime(contentType) {
    const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
    return mime === 'application/javascript'
        || mime === 'text/javascript'
        || mime === 'application/ecmascript'
        || mime === 'text/ecmascript'
        || mime.endsWith('+javascript');
}

async function preflightWebGpuRuntimeAssets(/*prefix unused when null path*/) {
    // if wasmPaths is null, ort.all.min.js resolves its own wasm path from script location
    return { ok: true };
}

async function loadAllenkFdncnnRuntime(runtimeProfile = resolveAllenkFdncnnRuntimeProfile()) {
    const profile = runtimeProfile || resolveAllenkFdncnnRuntimeProfile();
    if (!allenkFdncnnRuntimePromises.has(profile.id)) {
        const runtimePromise = (async () => {
            const response = await fetch(profile.modelUrl);
            if (!response.ok) {
                throw new Error(`Failed to load AI model: ${response.status}`);
            }
            const modelBytes = new Uint8Array(await response.arrayBuffer());
            if (navigator.gpu && window.__gwrDisableWebGpuDenoise !== true) {
                try {
                    const webgpuOrt = globalThis.ort;
                    if (!webgpuOrt) throw new Error('Global ort not found');
                    return await createAllenkFdncnnOnnxRuntime({
                        ort: webgpuOrt,
                        modelBytes,
                        executionProvider: 'webgpu',
                        wasmPaths: null,
                        inputName: 'fdncnn_input',
                        outputName: 'fdncnn_output',
                        inputShape: profile.inputShape,
                        outputShape: profile.outputShape
                    });
                } catch (error) {
                    console.warn('WebGPU AI runtime unavailable, falling back to WASM:', error);
                }
            }
            return createAllenkFdncnnOnnxRuntime({
                modelBytes,
                executionProvider: 'wasm',
                wasmPaths: ALLENK_FDNCNN_WASM_PATHS,
                inputName: 'fdncnn_input',
                outputName: 'fdncnn_output',
                inputShape: profile.inputShape,
                outputShape: profile.outputShape
            });
        })();
        allenkFdncnnRuntimePromises.set(profile.id, runtimePromise);
        runtimePromise.catch(() => {
            if (allenkFdncnnRuntimePromises.get(profile.id) === runtimePromise) {
                allenkFdncnnRuntimePromises.delete(profile.id);
            }
        });
    }
    return allenkFdncnnRuntimePromises.get(profile.id);
}

// --- Video Processing Orchestrator ---
async function startProcessing(file) {
    if (state.running) return;
    state.running = true;
    state.jobId++;
    const currentJobId = state.jobId;

    if (state.processedUrl) {
        URL.revokeObjectURL(state.processedUrl);
        state.processedUrl = null;
    }
    els.download.classList.remove('active');
    els.progressSection.classList.add('active');
    if (els.infoContainer) els.infoContainer.style.display = 'inline-flex';
    els.bar.style.width = '0%';
    setStatus(i18n[currentLang].loading_ai);

    try {
        // Step 1: Detect watermark position & resolution first
        setStatus(i18n[currentLang].detecting);
        const detectionResult = await detectGeminiVideoWatermark(file, {
            onProgress: (prog) => {
                if (state.jobId !== currentJobId) return;
                if (prog.phase === 'detect') {
                    const progressPercent = Math.round(prog.progress * 10); // 0% - 10%
                    els.bar.style.width = `${progressPercent}%`;
                }
            }
        });

        if (state.jobId !== currentJobId) return;

        // Step 2: Load optimal model based on detected watermark size
        setStatus(i18n[currentLang].loading_ai);
        const profile = resolveAllenkFdncnnRuntimeProfile(detectionResult.detection?.position);
        const runtime = await loadAllenkFdncnnRuntime(profile);

        if (state.jobId !== currentJobId) return;

        // Step 3: Remove watermark with loaded runtime and pre-computed detection
        const options = {
            allowLowConfidence: true,
            adaptiveAlpha: true,
            denoiseBackend: 'allenk-fdncnn-browser-spike',
            allenkFdncnnRuntime: runtime,
            allenkFdncnnSigma: 1.5,
            detection: detectionResult,
            onProgress: (prog) => {
                if (state.jobId !== currentJobId) return;
                if (prog.phase === 'export') {
                    const pct = Math.round(prog.progress * 100);
                    setStatus(`${i18n[currentLang].processing} (${pct}%)`);
                    els.bar.style.width = `${10 + Math.round(prog.progress * 90)}%`;
                }
            }
        };

        const result = await removeGeminiVideoWatermark(file, options);
        if (state.jobId !== currentJobId) return;

        state.processedUrl = URL.createObjectURL(result.blob);
        els.download.href = state.processedUrl;
        els.download.download = `rm-bg_${file.name.replace(/\\.[^/.]+$/, "")}.mp4`;
        els.download.classList.add('active');
        
        setStatus(i18n[currentLang].done);
        els.bar.style.width = '100%';
    } catch (err) {
        console.error(err);
        if (state.jobId === currentJobId) {
            setStatus(`${i18n[currentLang].err_export} ${err.message || err}`, true);
            els.bar.style.width = '0%';
        }
    } finally {
        if (state.jobId === currentJobId) {
            state.running = false;
        }
        if (els.infoContainer) els.infoContainer.style.display = 'none';
        if (els.infoTooltip) els.infoTooltip.classList.remove('show');
    }
}

// --- Drag and Drop Events ---
els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('drag');
});
els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('drag');
});
els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('drag');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
            startProcessing(file);
        }
    }
});
els.fileInput.addEventListener('change', () => {
    const files = els.fileInput.files;
    if (files.length > 0) {
        startProcessing(files[0]);
    }
});
