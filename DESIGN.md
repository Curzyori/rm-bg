# DESIGN.md

version: 1.0
name: RM-BG-Watermark-NotebookLM-Inspired
description: |
  Sistem desain dan panduan identitas visual untuk aplikasi utilitas web "RM-BG+Watermark All-in-One". 
  Mengadopsi estetika yang terinspirasi dari NotebookLM: stark monochrome (hitam-putih kemurnian tinggi), 
  fokus pada utilitas dan kecepatan, sangat bersih, dan elegan. Sistem ini membuang efek bayangan (drop shadows) 
  dan elemen dekoratif yang tidak perlu, mengandalkan garis tepi (hairlines) 1px untuk hierarki dan kedalaman.

colors:
  # --- LIGHT MODE (Default) ---
  light:
    primary: "#000000"           # Hitam untuk CTA utama dan fokus
    on-primary: "#ffffff"        # Putih kertas untuk teks di atas CTA
    canvas: "#ffffff"            # Background utama halaman (putih bersih)
    canvas-soft: "#f9f9f9"       # Background sekunder (untuk dropzone / state kosong)
    ink: "#000000"               # Warna teks utama
    ink-muted: "#5f5f5f"         # Teks sekunder / caption
    hairline: "#e5e5e5"          # Garis pemisah standar (1px)
    hairline-strong: "#000000"   # Garis batas saat elemen di-hover/fokus
    status-error: "#d93025"      # Warna merah utilitas (hanya untuk peringatan)
    status-success: "#0f9d58"    # Hijau utilitas (WASM Ready)

  # --- DARK MODE ---
  dark:
    primary: "#ffffff"           # Putih untuk CTA utama
    on-primary: "#000000"        # Hitam untuk teks di atas CTA
    canvas: "#000000"            # Background utama (hitam murni / AMOLED)
    canvas-soft: "#111111"       # Background sekunder (hitam keabu-abuan)
    ink: "#ffffff"               # Warna teks utama (putih murni)
    ink-muted: "#a0a0a0"         # Teks sekunder terang
    hairline: "#333333"          # Garis tepi tipis gelap
    hairline-strong: "#ffffff"   # Garis batas tegas / hover
    status-error: "#ff5e5e"      # Merah yang disesuaikan untuk layar gelap
    status-success: "#34a853"    # Hijau utilitas (WASM Ready)

typography:
  display-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: "600"
    letterSpacing: "-0.5px"
  heading-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: "500"
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: "400"
    letterSpacing: "0"

rounded:
  none: "0px"
  sm: "4px"          # Geometri kaku minimalis yang menjadi ciri khas
  md: "6px"
  full: "9999px"     # Hanya digunakan untuk indikator status kecil (WASM Ready)

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"

components:
  button-primary:
    backgroundColor: "var(--primary)"
    textColor: "var(--on-primary)"
    typography: "{typography.body-sm} (Medium)"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
    border: "1px solid var(--primary)"
  
  button-outline:
    backgroundColor: "transparent"
    textColor: "var(--ink)"
    typography: "{typography.body-sm} (Medium)"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
    border: "1px solid var(--hairline-strong)"
  
  dropzone-area:
    backgroundColor: "var(--canvas-soft)"
    textColor: "var(--ink-muted)"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxl}"
    border: "1px dashed var(--hairline-strong)"
  
  utility-card:
    backgroundColor: "var(--canvas)"
    rounded: "{rounded.sm}"
    padding: "{spacing.lg}"
    border: "1px solid var(--hairline)"
    
  console-log-output:
    backgroundColor: "var(--canvas-soft)"
    textColor: "var(--ink-muted)"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    border: "1px solid var(--hairline)"

---

## Panduan Implementasi (Do's and Don'ts)

### 1. Palet Warna & Kedalaman (Stark Monochrome)
* **DO:** Gunakan warna hitam murni (`#000000`) dan putih murni (`#ffffff`) sebagai pondasi utama antarmuka di kedua mode (terapkan pembalikan total / *polarity flip*). Elevasi antar komponen hanya ditentukan oleh garis tepi (*hairline border* 1px).
* **DON'T:** Dilarang menggunakan *drop-shadow* (bayangan), gradien warna, atau warna-warna neon pastel. Tampilan aplikasi WebAssembly/ONNX ini harus terasa seperti *tools* yang presisi.

### 2. Tipografi Utilitas
* **DO:** Padukan **Inter** untuk keterbacaan umum (Judul, deskripsi alat, label tombol) dengan **JetBrains Mono** untuk data teknis. 
* **DO:** Selalu gunakan font *monospace* (JetBrains Mono) untuk hal-hal berbau sistem: ukuran file (contoh: `1.2 MB`), nama file hasil unduhan (`output_nobg.png`), dan terutama log sistem WASM (`[WASM] Loading ONNX Model...`).
* **DON'T:** Jangan gunakan font dekoratif atau terlalu memperbesar ukuran font. Ukuran terbesar cukup di `32px` untuk judul hero aplikasi.

### 3. Geometri & Interaksi Elemen
* **DO:** Terapkan sudut kaku / radius minimal (`4px`) pada setiap tombol, form, dan kartu (seperti kartu pratinjau Gemini / NotebookLM). 
* **DO:** Untuk area *Drag & Drop* (Dropzone), gunakan garis putus-putus (*dashed border*) pada *state* aktif untuk mempertegas fungsi aksi.
* **DON'T:** Dilarang menggunakan sudut bulat/pill (`border-radius: 9999px`) untuk tombol utama. Simpan bentuk lingkaran penuh HANYA untuk indikator status kecil (contoh: titik hijau kecil di sebelah teks "WASM Ready").

### 4. Penanganan Mode Gelap/Terang (Dark/Light Mode)
* **DO:** Terapkan deteksi mode preferensi sistem pengguna (`@media (prefers-color-scheme: dark)`), dan sediakan *toggle* manual (tombol berbentuk ikon kotak atau lingkaran hitam/putih) di sudut kanan atas.
* **DO:** Saat berpindah ke Dark Mode, pastikan *background* adalah hitam murni (`#000000`), bukan abu-abu gelap, agar terasa otentik layaknya terminal utilitas.

### 5. Penanganan Proses In-Browser (WASM/ONNX)
Karena aplikasi mengeksekusi model *machine learning* di dalam browser (in-browser WASM) secara lokal (tanpa server) sesuai PRD:
* **DO:** Gunakan teks monospace untuk mengindikasikan status pemrosesan. 
* **Contoh UI State:** Saat pengguna memproses gambar, hilangkan gambar dan tampilkan log teks berkedip `> Memproses watermark... harap tunggu` atau *progress bar* berbasis teks monospace di tengah area abu-abu `canvas-soft`.
