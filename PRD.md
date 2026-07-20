# Product Requirements Document — RM-BG+Watermark All-in-One

**Status:** Deploy Ready
**Author:** Curzy
**Date Created:** 2026-07-19
**Version:** 1.0
**Related local repos:** `.sample/gemini-watermark-remover` (Node image WM), `.sample/notebooklm-watermark-remover-v2` (Python PDF WM), `.sample/rembg` (placeholder, empty)

---

## Problem Statement

### The Problem
A user who gets a Gemini-generated image or a NotebookLM PDF export must (1) remove the background, (2) remove the Gemini SynthID watermark, and/or (3) remove the NotebookLM footer watermark. Each currently lives in a different tool with different run modes (browser userscript, Node CLI, Python FastAPI). There is no single entry point.

### Current State
- Background removal: separate SaaS or local model.
- Gemini image watermark: `gemini-watermark-remover` Tampermonkey userscript or Node CLI — not a website.
- NotebookLM PDF watermark: `notebooklm-watermark-remover-v2` FastAPI app — separate site.
- User manually downloads, re-uploads, and re-downloads between tools.

### Impact
- **User:** 3 tabs, 3 formats, repeated uploads, dropped files.
- **Business:** none yet (personal/project tool); value is time saved + a shippable all-in-one utility.

### Why Now?
The three engines already exist locally in `.sample/`. Wrapping them is a low-cost build with immediate personal/utility value.

---

## Goals & Objectives

### Business Goals
1. Ship a working all-in-one web utility reusing existing engines (no net-new ML research).
2. Keep it free/self-hostable (no paid API keys) by using MIT/local models.

### User Goals
1. Upload one file, get one cleaned file.
2. Not care which engine runs — the app routes by file type/content.
3. Trust it runs locally/privately (no third-party upload of their images).

### Non-Goals
- Not building new watermark-detection ML.
- Not supporting video in MVP (the Gemini repo has `dist/video-app.js` but it is out of scope for v1).
- Not a paid SaaS with accounts/billing in MVP.

---

## Target Users

- **Content creators** — clean AI-generated images for reuse (bg gone + watermark gone in one place).
- **Students / researchers** — strip NotebookLM image watermark from exported assets.
- Tech-savvy enough to drag-drop a file; not CLI/userscript users.

---

## User Stories & Requirements

### Epic: Single-Upload Cleanup

#### Story 1: Upload one image, get background + watermark removed
```
As a creator,
I want to upload one image and receive one image with background removed and Gemini/NotebookLM watermark stripped,
So that I don't run three tools.
```
**Acceptance Criteria:**
- [ ] Given a PNG/JPG with a background and a Gemini SynthID watermark, when uploaded, then output has transparent background + no visible watermark.
- [ ] Given an image with no watermark, when uploaded, then only background is removed (no corruption).
- [ ] Edge: given a non-image file, when uploaded, then clear error, no processing.

**Priority:** P0 | **Effort:** M | **Dependencies:** `gemini-watermark-remover` engine, `@imgly/background-removal`

#### Story 2: Upload one NotebookLM PDF, get clean PDF
```
As a student,
I want to upload a NotebookLM PDF and get the same PDF with the footer watermark removed,
So that I can use it in class.
```
**Acceptance Criteria:**
- [ ] Given a NotebookLM-exported PDF, when uploaded, then output PDF has the bottom-right watermark box repainted with sampled background.
- [ ] Given a PDF with no detectable NotebookLM watermark, when uploaded, then PDF returned unchanged (or user notified "no watermark found").
- [ ] Edge: PDF > 50MB rejected with message.

**Priority:** P2 (future) | **Effort:** S | **Dependencies:** `notebooklm-watermark-remover-v2`

#### Story 3: Auto-route by file type
```
As any user,
I want the app to detect image vs PDF and run the right pipeline,
So that I don't pick a mode.
```
**Acceptance Criteria:**
- [ ] Given `*.png/*.jpg/*.webp`, route to image pipeline (the only pipeline in v1).
- [ ] Given `*.pdf`, show "PDF belum didukung di v1" (deferred — see Decision Log #5).
- [ ] Given unsupported type, show supported-format message.

**Priority:** P0 | **Effort:** S

#### Story 4: See before/after + download
```
As a user,
I want a before/after preview and a download button,
So that I can verify and save the result.
```
**Acceptance Criteria:**
- [ ] Output preview shown after processing.
- [ ] Download link returns the original format (PNG for images, PDF for PDFs).
- [ ] Image output keeps transparency (PNG).

**Priority:** P0 | **Effort:** S

### Functional Requirements

| Req ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| FR-001 | Accept single image upload (PNG/JPG/WEBP) | P0 | Open |
| FR-002 | Remove background via `@imgly/background-removal` | P0 | Open |
| FR-003 | Strip Gemini/NotebookLM SynthID image watermark (reuse Node engine) | P0 | Open |
| FR-004 | Accept single PDF upload | P2 (future) | Open |
| FR-005 | Strip NotebookLM PDF footer watermark (reuse Python engine) | P2 (future) | Open |
| FR-006 | Auto-detect file type and route pipeline | P0 | Open |
| FR-007 | Before/after preview + download | P0 | Open |
| FR-008 | Error states for unsupported/oversized files | P1 | Open |

### Non-Functional Requirements

| Req ID | Category | Description | Target |
|--------|----------|-------------|--------|
| NFR-001 | Performance | Image pipeline (bg + WM) | < 15s for 1024px on a typical laptop |
| NFR-002 | Performance | Browser first-load (CDN model fetch) | WASM ~24MB + model ~40MB; cached after first load |
| NFR-003 | Privacy | Files processed locally / in-page | No third-party upload |
| NFR-004 | Compatibility | Browsers | Chromium + Firefox latest |
| NFR-005 | Accessibility | WCAG 2.1 AA for the upload UI | AA |

---

## Scope

### In Scope (MVP v1)
- One-upload image pipeline: bg removal (`@imgly`) + Gemini/NotebookLM SynthID image watermark strip (`gemini-watermark-remover` Canvas engine).
- Auto-routing by extension (image types only in v1).
- Preview + download.
- Self-hosted / static, no paid keys, no server.

### Out of Scope (v1)
- **PDF pipeline** (NotebookLM footer strip) — deferred (see Decision Log #5; requires Python/PyMuPDF which can't run in-browser or on Vercel static). Moves to a future release with a serverless container or separate deployment.
- Video watermark removal (Gemini repo has `video-app.js` but excluded).
- User accounts / cloud storage.
- Batch / zip upload of many files.
- New ML models; we only reuse existing engines.

### Future Considerations
- Batch upload.
- Adjustable WM-strip aggressiveness slider.
- Video pipeline.
- Hosted multi-user deployment with queue.

---

## Technical Considerations

### High-Level Architecture

100% browser-side. No backend, no server, no API. Vite bundles two engines into static files served from Vercel edge:

```
index.html (upload UI + preview)
    │
    ▼  (in-browser, no network)
[1] @imgly/background-removal (ONNX WASM, model from CDN at runtime)
        → removes background, outputs transparent PNG as Blob
    │
    ▼  (in-browser, Canvas pipeline)
[2] gemini-watermark-remover engine (pure Canvas, imported as JS module)
        → detects + strips SynthID watermark using geometry + alpha estimation
    │
    ▼  (Canvas.toBlob / convertToBlob)
Download button → user saves cleaned PNG
```

Both engines run in the user's browser. No file leaves the machine.

### Technology Stack
- **Frontend:** Plain HTML + vanilla JS, bundled by Vite (bundler only, no framework).
- **Background engine:** `@imgly/background-removal` (MIT) — ONNX WASM, model fetched from CDN `https://staticimgly.com/@imgly/background-removal-data/...` at runtime. Configured model: `isnet_fp16`, preloaded on page load.
- **Image WM engine:** `gemini-watermark-remover` browser build, copied into `src/lib/gemini-wm/` as JS modules. Pure Canvas + alpha-map estimation — no ONNX for the image path.
- **Hosting:** Vercel static (`dist/` output). COOP/COEP headers in `vercel.json` enable SharedArrayBuffer (WASM threading).
- **Privacy:** no server, no API, no upload. Files processed in-page only.

### API Requirements
None. No network calls except the @imgly model CDN fetch (first load, cached after).

### Security
- Validate file type (`image/png|jpeg|webp`) + size (≤ 20MB) at the input boundary before processing.
- No temp files, no server, no PII retention, no logs of image contents.
- If deployed publicly, add rate limiting at the CDN/edge level (defense-in-depth only — app itself has no server).

### Performance
- Image pipeline is CPU/ONNX-heavy; runs sequentially (bg first, then WM). First load pulls ~24MB ONNX WASM + ~40MB model from CDN, then cached.
- Expect seconds-to-tens-of-seconds on laptop CPU for 1024px.

### Data Considerations
- Files never leave the browser. No storage, no retention, no server logs.

## Design & UX Requirements

### UX Principles
- One drop zone. No mode selection. "Upload → wait → download."
- Show a spinner with stage label ("Removing background…" → "Stripping watermark…").
- Before/after side-by-side for images.

### User Flow
1. User opens site.
2. Drag/drop or pick one file.
3. App detects type, shows progress stages.
4. Preview appears; download button enabled.
5. User downloads; temp file deleted.

### Visual Design
Reuse the existing glassmorphism style from the sample apps (dark, blurred cards). No new design system needed.

### Accessibility
- Labeled file input, keyboard-operable drop zone, `alt`/status text for preview, AA contrast.

### Responsive
- Mobile: single column, full-width drop zone. Desktop: before/after split.

### Screens (functional, layout AI-driven)

- **Upload / Dropzone** — single screen. States: Normal (idle dropzone + hint), Loading (progress bar + stage label), Error (red status text), Done (before/after grid + download).
- **Before/After Preview** — two figure cards (Sebelum / Sesudah) on a checker background to show PNG transparency. States: Hidden (pre-process), Visible (post-process).
- **Download** — emerald anchor button, `download="cleaned.png"`. States: Disabled (pre-process), Enabled (post-process).
- No settings screen, no modal, no nav (single-screen utility).

### Error Handling

| Scenario | Handling |
|----------|----------|
| Unsupported file type (not png/jpg/webp) | Block at input, status text: "Format tidak didukung (PNG/JPG/WebP)". |
| File > 20MB | Reject before processing, status text: "File terlalu besar (max 20MB)". |
| Background removal model fails to load (CDN/network) | Catch promise rejection, status text: error + hint to retry / check connection. |
| Watermark step throws on a frame | Skip WM step, return bg-removed image with warning status; never crash the pipeline. |
| Browser lacks SharedArrayBuffer (no COOP/COEP) | WASM falls back to single-thread; slower but functional. Header misconfig flagged in console. |

---

### Timeline & Milestones

Single checkpoint-based timeline (no weekly phases — Vite scaffold + builder verification already done):

| Phase | Deliverables |
|-------|-------------|
| ✅ Scaffold | Vite project + `index.html` upload UI + `src/main.js` orchestrator |
| ✅ Build | Image pipeline wired (bg removal + Gemini image WM), build passes (57 modules, 24MB) |
| ✅ Verify | Gemini engine standalone test passed (1024×1024, watermark removal correct) |
| Pending | End-to-end test in real browser (headless @imgly WASM stalls — environment, not code) |
| Pending | Deploy to Vercel (`vercel --prod`) + verify in real browser

---

## Risks & Mitigation

| Risk | Impact | Prob | Mitigation |
|------|--------|------|------------|
| `@imgly/background-removal` model download + WASM size (~24MB WASM + ~40MB model from CDN) | Med | Med | Preload on page load; model cached in browser after first fetch. Vendor model into `public/` later for offline/private use. |
| Headless/CI WASM stalls (CPU ONNX slow in sandboxed env) | Low | Med | Real browser fine; headless test env only. Not a code defect. |
| Gemini WM miss on unusual image sizes | Low | Med | Before/after preview lets user reject; engine's size catalog covers common Gemini/NotebookLM outputs. |
| Watermark-removal side effects on non-watermarked areas | Low | Low | Only run WM step on detected watermark zones (geometry-based). |

---

## Dependencies & Assumptions

### Dependencies
- [ ] `gemini-watermark-remover` browser build vendored into `src/lib/gemini-wm/` (Canvas engine, no build step).
- [ ] `@imgly/background-removal` npm package available (replaces empty `rembg`).
- [ ] Vite + `vercel.json` (COOP/COEP headers) configured.

### Assumptions
- User accepts local/self-hosted run (no hosted multi-tenant in v1).
- Input is a single file per request.
- Gemini watermark is the SynthID type the Node engine targets (geometry+alpha), not arbitrary text overlays.

---

## Decision Log

| # | Keputusan | Alternatif | Alasan |
|---|-----------|------------|--------|
| 1 | **100% browser-side**, no backend | Node/Express orchestrator + Python FastAPI sidecar | Vercel static gratis; @imgly sudah WASM-native; gemini WM engine punya build browser. Server = biaya + maintenance. |
| 2 | **HTML + vanilla JS + Vite** (no React/Vue) | Next.js, React, Astro | Single-screen, no routing/state. Vite cuma bundler WASM. React = 200KB overhead tak terpakai. |
| 3 | **@imgly/background-removal** for remove-bg | rembg (empty), remove.bg API (berbayar), u2net manual | MIT, npm install, ONNX WASM in-browser. remove.bg butuh API key + bayar per request. |
| 4 | **Gemini WM engine pure Canvas** (bukan ONNX di image path) | ONNX video approach | Image WM = geometry + alpha-map estimation via Canvas. ONNX hanya untuk video denoise. Bundle tetap kecil. |
| 5 | **PDF pipeline deferred ke future** | Proxy ke notebooklm Python server | PyMuPDF gak bisa di browser; Vercel static gak proxy FastAPI. V1 fokus image; PDF masuk roadmap. |

## Open Questions

- [x] **Orchestrator language?** → Resolved: no orchestrator. 100% browser-side (Decision Log #1).
- [x] **Where does bg removal run?** → In-browser WASM (`@imgly`), model from CDN. No server (Decision Log #1).
- [x] **Combine into one repo?** → Yes, single Vite repo, engines vendored into `src/lib/`.
- [ ] **Self-host model vs CDN fetch?** Privacy-conscious deployments may want to vendor the @imgly ONNX model into `public/` to avoid the CDN call. Out of scope for v1 (CDN default).
- [ ] **PDF pipeline delivery?** Future: either a Vercel serverless Python function (PyMuPDF) or a separate small service. Not decided.

---

## URL Pattern

| Link | Pattern |
|------|---------|
| GitHub | `github.com/curzyori/rm-bg` |
| Website | `rm-bg.curzy.dev` |
| Donate | `donate.curzy.dev` |

## Distribution

Static web app — no native binary.

| Platform | Format | Hosting |
|----------|--------|---------|
| Web | Static build (`dist/` from `vite build`) | Vercel static (`vercel --prod`) |
| Self-host | Static files (any static server) | `python3 -m http.server` / nginx |

COOP/COEP headers (set in `vercel.json`) required for ONNX WASM SharedArrayBuffer threading.

## Appendix

### References
- `.sample/gemini-watermark-remover/AGENTS.md` — watermark size/anchor catalog, build notes.
- `.sample/notebooklm-watermark-remover-v2/app.py` — PDF WM FastAPI.
- `.sample/rembg` — empty placeholder; superseded by `@imgly/background-removal`.

### Glossary
- **SynthID:** Google's invisible/visible AI watermark; the Gemini image engine targets its visible bottom-right mark.
- **ONNX:** Open model format used by both bg + WM engines.
