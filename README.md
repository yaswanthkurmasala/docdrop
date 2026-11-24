# DocDrop — Private Client-Side Document & PDF Studio

> **100% Client-Side In-Browser Execution • Zero Server Uploads • Cryptographic Privacy**

DocDrop is a high-performance, private client-side document workstation and conversion studio built with Next.js 16 (Turbopack), React 19, and Tailwind CSS. All operations execute entirely inside local browser memory via WebWorkers and WebAssembly, ensuring that sensitive documents, contracts, and financial spreadsheets never leave your device.

---

## Key Capabilities

### 1. Document Intelligence & LLM-Ready Conversion
- **Multi-Format Ingestion:** Convert PDF, Word (`.docx`), and Excel (`.xlsx`) directly into clean, LLM-ready GitHub Flavored Markdown (GFM).
- **Token Estimator & RAG Chunker:** Real-time token counter (GPT-4, Claude, and Gemini presets) with interactive chunk slider (128 – 2048 tokens) and spatial alignment.
- **Table Reconstruction:** Spatial coordinate clustering algorithm that preserves structured tabular grids from complex PDFs and spreadsheets.

### 2. Comprehensive PDF Instrument Suite (25+ Tools)
- **Organize & Structure:** Merge PDFs, Split into page ranges, Remove unwanted pages, Extract custom sequences, Reorder visually, and Scan images to PDF.
- **Optimize & Repair:** Stream compression (Recommended, Extreme, Light presets), PDF xref table reconstruction, and OCR text layer audit.
- **Format Interoperability:** Convert PDF to Word, PDF to Excel, PDF to PDF/A (Archival Standard), JPG to PDF, Word to PDF, and HTML to PDF.
- **Security & Certification:** Certified digital signatures with tamper-evident audit badge stamps, irreversible term redaction via canvas rasterization, AES-256 encryption password protection, and decryption.
- **Page Polish:** Stamp customizable text/image watermarks, add facing-page numbers, trim visual whitespace margins, and flatten interactive PDF form layers.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **UI & Animation:** React 19, Tailwind CSS v4, Motion (Framer Motion tokens)
- **PDF & Document Engines:** `pdf-lib`, `pdfjs-dist`, `docx`, `xlsx`, `mammoth`, `jszip`
- **Typography:** Official Ryanoasis Nerd Fonts (`JetBrainsMono Nerd Font`, `FiraCode Nerd Font`) & Plus Jakarta Sans
- **Color Palette:** Warm Obsidian & Sunset Amber (`oklch`)

---

## Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm, pnpm, or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
# Compile optimized production bundle
npm run build

# Start production server
npm run start
```

### Running Verification Tests
```bash
# Run the complete 38-suite automated engine test
node scripts/test-complete-suite.mjs

# Run integration tests
node scripts/test-pdf-suite.mjs
```

---

## License & Privacy Guarantee

All document operations are performed purely client-side in the browser. Zero documents, text streams, or file bytes are ever uploaded to external servers.
