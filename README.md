# DocDrop — The Private Client-Side Document & PDF Studio

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.4_(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-40%2F40_Passing-emerald?style=for-the-badge&logo=checkmarx&logoColor=white)](scripts/test-complete-suite.mjs)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_In--Browser_RAM-purple?style=for-the-badge&logo=shield&logoColor=white)](#privacy--security-guarantee)

**A high-performance, private document workstation and live PDF editor built with Next.js 16, React 19, and WebAssembly.**  
*All conversions, edits, and encryptions run 100% in client-side browser memory. Zero files or text streams are ever sent to an external server.*

[Explore All 33 Tools](#the-33-instrument-suite) • [Canva Live Editor](#canva-style-live-pdf-editor-studio) • [Getting Started](#getting-started) • [Architecture](#architecture--performance)

</div>

---

## Highlights & Flagship Features

### 🎨 Canva-Style Live PDF Editor Studio
* **In-Place Word & Sentence Editing:** Click on **any** word or paragraph directly on the rendered PDF to edit it live with identical typography, baseline alignment, and styling.
* **Exact Font Detection & Matching:** Automatically identifies the font family from the PDF stream (`Helvetica / Arial`, `Times Roman / Serif`, or `Courier / Monospace`) along with weight, italic slant, font size, and color.
* **Flawless Mask & Replace Engine:** Cleanly masks original glyphs with an opaque background rectangle and renders replacement text at the exact baseline coordinate without disrupting surrounding text or layout.
* **Canvas Tools:**
  * 🖱️ **Select & Edit Text:** Direct in-place editing on any page.
  * 🔤 **Add Text Box:** Insert custom typography anywhere with full font, size, weight, and color control.
  * 🧽 **Whiteout / Eraser:** Drag to mask and erase unwanted logos, signatures, or confidential areas.
  * 🖍️ **Neon Highlighter:** Drag to highlight key phrases in translucent yellow, green, pink, or cyan.
  * 🛡️ **Certified Stamps:** One-click official status stamps (Approved, Confidential, Rejected, Draft).
* **Multi-Page & Zoom Dock:** Non-blocking rendering across multi-page documents (including 50+ page PDFs) with high-DPI scaling, Undo/Redo (`Ctrl+Z` / `Ctrl+Y`), and a collapsible Modifications Drawer.

### 🧭 Step-by-Step Guided Studio Workflow
Every instrument operates through a sequential, state-driven 3-step workflow:
1. **Step 1: Upload & Preflight** — Drag-and-drop ingestion, format verification, page count extraction, and immediate sample loading.
2. **Step 2: Interactive Studio & Configuration** — Tool-specific interactive studio (visual reordering, live redact canvas, split page selector, watermark angle slider, or Canva live editor).
3. **Step 3: In-RAM Processing & Instant Download** — Real-time progress tracker and instant client-side file export.

### 🧠 Document Intelligence & LLM-Ready Tools
* **Multi-Format Markdown Ingestion:** Convert PDF, Word (`.docx`), and Excel (`.xlsx`) directly into clean, LLM-ready GitHub Flavored Markdown (GFM).
* **Token Estimator & RAG Chunker:** Real-time token counter (GPT-4o, Claude 3.5, and Gemini 2.0 presets) with interactive chunk slider (128 – 2048 tokens) and spatial alignment.
* **Bilingual Translation Layout:** Side-by-side split layout generator preserving source paragraphs and translation alignment.
* **AI Document Summarizer:** In-browser extractive text density scoring and salient key takeaway generation.

### 🔒 Privacy & Security Guarantee
* **Zero Server Uploads:** Document bytes are processed solely within client-side WebAssembly, WebWorkers, and browser memory (RAM).
* **Cryptographic PDF Security:** Military-grade 256-bit AES encryption (`protect-pdf`), in-browser decryption (`unlock-pdf`), permanent term redaction with deep canvas rasterization (`redact-pdf`), and SHA-256 digital signature audit badges (`sign-pdf`).

---

## The 33-Instrument Suite

| Category | Tool | Description | Engine / Output |
| :--- | :--- | :--- | :--- |
| **Organize** | **Merge PDF** | Combine multiple PDF files in custom order | `pdf-lib` Vector |
| **Organize** | **Split PDF** | Extract single pages, custom ranges, or burst into ZIP | Range & ZIP |
| **Organize** | **Remove Pages** | Delete unwanted pages visually with safeguard checks | Non-destructive |
| **Organize** | **Extract Pages** | Select and export specific page subsets into a new PDF | Custom Range |
| **Organize** | **Organize PDF** | Visual drag-and-drop thumbnail grid, reverse & reorder | Non-blocking 50+ |
| **Organize** | **Scan to PDF** | Capture camera or photos and compile into crisp PDF | High-res Canvas |
| **Optimize** | **Compress PDF** | Reduce file size with Recommended, Extreme, or Light presets | Stream flate |
| **Optimize** | **Repair PDF** | Rebuild broken xref tables and salvage corrupt PDF streams | Header recovery |
| **Optimize** | **OCR Text Layer Audit** | Audit embedded digital text streams & preflight layer density | Layer inspect |
| **Convert From** | **PDF to Word** | Convert PDF to editable Microsoft Word (`.docx`) | Document AST |
| **Convert From** | **PDF to Excel** | Extract tabular data grids directly into Excel (`.xlsx`) | Coordinate grid |
| **Convert From** | **PDF to Slides (ZIP)** | Export high-resolution presentation slides bundled in ZIP | Packaged ZIP |
| **Convert From** | **PDF to PDF/A** | Standardize document metadata for ISO archival compliance | ISO 19005-1 |
| **Convert From** | **PDF to JPG** | Extract all pages into high-resolution JPG images | Crisp Canvas |
| **Convert To** | **Word to PDF** | Convert `.docx` documents into clean PDF files | Client AST |
| **Convert To** | **Excel to PDF** | Convert spreadsheets into structured PDF table grids | Formatted table |
| **Convert To** | **HTML to PDF** | Render web pages or raw HTML files into high-quality PDFs | Vector layout |
| **Convert To** | **JPG to PDF** | Convert JPG, PNG, and WebP images into unified PDFs | Multi-image |
| **Edit** | **Canva Live PDF Editor** | In-place word editing, font matching, text boxes, whiteout | Canva Studio |
| **Edit** | **Rotate PDF** | Rotate individual or all pages by 90°, 180°, or 270° | Fast metadata |
| **Edit** | **Add Watermark** | Stamp custom text or image watermarks with angle and opacity | 9-Grid overlay |
| **Edit** | **Add Page Numbers** | Add customized pagination with numbering formats & positions | Multi-format |
| **Edit** | **Crop PDF** | Trim document margins and whitespace evenly | ViewBox trim |
| **Edit** | **PDF Forms Audit & Flatten** | Inspect interactive AcroForms and flatten into vector print | Immutability |
| **Security** | **Protect PDF** | Encrypt PDF with 256-bit AES military-grade password security | Web Crypto |
| **Security** | **Unlock PDF** | Remove password restrictions and decrypt in browser RAM | Client-side auth |
| **Security** | **Sign PDF** | Stamp certified digital signature badges, timestamps, & SHA-256 | Signature Studio |
| **Security** | **Redact PDF** | Permanent blackout of sensitive terms with canvas rasterization | Irreversible |
| **Security** | **Compare PDF** | Visual side-by-side comparison to detect edits and additions | Diff highlights |
| **Intelligence** | **PDF to Markdown** | Convert PDFs, DOCX, and XLSX into LLM-ready GFM tables | Markdown AST |
| **Intelligence** | **Token Estimator & Chunker** | Real-time token counter & RAG chunk slider (128-2048 tokens) | Multi-model |
| **Intelligence** | **AI & NLP Summarizer** | Analyze document density and extract key salient takeaways | In-browser NLP |
| **Intelligence** | **Translate PDF Layout** | Extract and structure text into dual-column bilingual views | Multi-language |

---

## Architecture & Performance

```
docdrop/
├── src/
│   ├── app/                          # Next.js 16 App Router & Turbopack routes
│   │   ├── tools/[slug]/page.tsx     # Dynamic routing for all 33 tools
│   │   └── layout.tsx                # Obsidian Dark & Light theme root
│   ├── components/
│   │   ├── tools/
│   │   │   ├── CanvaPdfEditor.tsx    # Canva-style Live Studio (lazy-loaded)
│   │   │   ├── SignPdfStudio.tsx     # Digital signature studio (lazy-loaded)
│   │   │   └── UniversalPdfTool.tsx  # Unified 3-step studio orchestrator
│   │   └── StepWorkflowTracker.tsx   # Sequential progress indicator
│   └── lib/
│       ├── pdf-tools/                # 100% In-Browser Engine Core
│       │   ├── edit/                 # Live editor, annotate, rotate, watermark, crop
│       │   ├── security/             # AES-256 encryption, unlock, sign, redact
│       │   ├── convert-to/           # Word, Excel, HTML, Images to PDF
│       │   ├── convert-from/         # PDF to Word, Excel, Slides, PDF/A, JPG
│       │   ├── organize/             # Merge, Split, Remove, Organize, Scan
│       │   └── intelligence/         # Markdown parser, RAG chunker, Summarizer
│       └── tools-registry.ts         # Central metadata and tool configuration
└── scripts/
    └── test-complete-suite.mjs       # Automated 40-test validation runner
```

### Performance & Bundle Optimizations
* **Dynamic Code-Splitting (`next/dynamic`):** Heavy vector studios (`CanvaPdfEditor`, `SignPdfStudio`) are dynamically split away from the initial bundle with custom skeleton states.
* **Immutable Asset Caching:** PDF.js Web Worker (`/pdf.worker.min.mjs`) is served with a 1-year immutable cache header (`max-age=31536000`), eliminating repeated downloads.
* **Non-Blocking 50+ Page Rendering:** Thumbnail generators yield to the browser event loop (`setTimeout(resolve, 0)` every 4 pages) to prevent UI freezes on large documents.
* **HTTP Security Headers:** Strict `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin` enforced.

---

## Getting Started

### Prerequisites
* **Node.js**: v18.17.0+ (Node.js 20+ recommended)
* **Package Manager**: `npm`, `pnpm`, or `yarn`

### Installation
```bash
# Clone repository
git clone https://github.com/yaswanthkurmasala/docdrop.git
cd docdrop/web-app

# Install dependencies
npm install

# Start development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
The project features an automated, client-engine test suite validating all 33 instruments:

```bash
# Execute the comprehensive 40-test validation suite
node scripts/test-complete-suite.mjs
```

### Production Build
```bash
# Build optimized Turbopack bundle (all 49 routes)
npm run build

# Start production server
npm run start
```

---

## License & Privacy Statement

This software guarantees **100% Client-Side In-Memory Execution**. No document, metadata, or text stream is transmitted to any cloud or third-party server. All operations occur in the volatile memory (RAM) of the user's browser and vanish upon closing the tab.
