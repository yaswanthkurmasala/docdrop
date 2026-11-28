export type ToolCategory =
  | "organize"
  | "optimize"
  | "convertTo"
  | "convertFrom"
  | "edit"
  | "security"
  | "intelligence"
  | "media";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  badge?: "Popular" | "AI" | "New" | "Pro" | "4K";
  status: "active" | "ready";
  accepts: string[];
}

export const CATEGORIES: Record<ToolCategory, { label: string; iconColor: string }> = {
  organize: { label: "ORGANIZE PDF", iconColor: "text-rose-500" },
  optimize: { label: "OPTIMIZE PDF", iconColor: "text-emerald-500" },
  convertTo: { label: "CONVERT TO PDF", iconColor: "text-amber-500" },
  convertFrom: { label: "CONVERT FROM PDF", iconColor: "text-blue-500" },
  edit: { label: "EDIT PDF", iconColor: "text-purple-500" },
  security: { label: "PDF SECURITY", iconColor: "text-sky-500" },
  intelligence: { label: "PDF INTELLIGENCE", iconColor: "text-indigo-500" },
  media: { label: "VIDEO & MEDIA", iconColor: "text-violet-500" },
};

export const TOOLS_REGISTRY: ToolDefinition[] = [
  // 1. ORGANIZE PDF
  {
    id: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one unified document in any order.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "split-pdf",
    name: "Split PDF",
    description: "Separate one page or a whole set for easy conversion into independent PDF files.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "remove-pages",
    name: "Remove Pages",
    description: "Delete unwanted pages visually from your PDF document.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "extract-pages",
    name: "Extract Pages",
    description: "Select and extract specific pages into a brand new PDF document.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "organize-pdf",
    name: "Organize PDF",
    description: "Reorder, reverse, duplicate, or customize PDF page sequences securely in-browser.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "scan-to-pdf",
    name: "Scan to PDF",
    description: "Capture paper documents or photos and compile into high-quality PDFs.",
    category: "organize",
    categoryLabel: "ORGANIZE PDF",
    status: "active",
    accepts: [".jpg", ".png", ".pdf"],
  },

  // 2. OPTIMIZE PDF
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality in-browser.",
    category: "optimize",
    categoryLabel: "OPTIMIZE PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "repair-pdf",
    name: "Repair PDF",
    description: "Repair a damaged PDF and recover data from corrupt documents.",
    category: "optimize",
    categoryLabel: "OPTIMIZE PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "ocr-pdf",
    name: "OCR Text Layer Audit",
    description: "Audit document text layers and extract digital text streams directly in-browser without external server exposure.",
    category: "optimize",
    categoryLabel: "OPTIMIZE PDF",
    badge: "Pro",
    status: "active",
    accepts: [".pdf"],
  },

  // 3. CONVERT TO PDF
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert JPG and PNG images to PDF in seconds with custom orientation.",
    category: "convertTo",
    categoryLabel: "CONVERT TO PDF",
    badge: "Popular",
    status: "active",
    accepts: [".jpg", ".jpeg", ".png", ".webp"],
  },
  {
    id: "word-to-pdf",
    name: "WORD to PDF",
    description: "Make DOC and DOCX files easy to read by converting them to PDF.",
    category: "convertTo",
    categoryLabel: "CONVERT TO PDF",
    status: "active",
    accepts: [".docx", ".doc"],
  },
  {
    id: "powerpoint-to-pdf",
    name: "POWERPOINT to PDF",
    description: "Convert presentation slides and visual decks into clean PDF documents.",
    category: "convertTo",
    categoryLabel: "CONVERT TO PDF",
    status: "active",
    accepts: [".png", ".jpg", ".pdf"],
  },
  {
    id: "excel-to-pdf",
    name: "EXCEL to PDF",
    description: "Convert Excel spreadsheets to PDF documents with clean table grids.",
    category: "convertTo",
    categoryLabel: "CONVERT TO PDF",
    status: "active",
    accepts: [".xlsx", ".xls", ".csv"],
  },
  {
    id: "html-to-pdf",
    name: "HTML to PDF",
    description: "Convert web pages or raw HTML files into high-quality PDF documents.",
    category: "convertTo",
    categoryLabel: "CONVERT TO PDF",
    status: "active",
    accepts: [".html", ".htm"],
  },

  // 4. CONVERT FROM PDF
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Extract all images in a PDF or convert each page into a high-res JPG.",
    category: "convertFrom",
    categoryLabel: "CONVERT FROM PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF documents to editable Microsoft Word files.",
    category: "convertFrom",
    categoryLabel: "CONVERT FROM PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "pdf-to-powerpoint",
    name: "PDF to Slides (ZIP)",
    description: "Export PDF pages into high-resolution presentation slide images packaged in a ZIP archive.",
    category: "convertFrom",
    categoryLabel: "CONVERT FROM PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract data straight from PDF tables directly into Excel spreadsheets using coordinate clustering.",
    category: "convertFrom",
    categoryLabel: "CONVERT FROM PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "pdf-to-pdfa",
    name: "PDF to PDF/A",
    description: "Standardize document metadata and archival conformance headers for long-term document archiving.",
    category: "convertFrom",
    categoryLabel: "CONVERT FROM PDF",
    status: "active",
    accepts: [".pdf"],
  },

  // 5. EDIT PDF
  {
    id: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate your PDFs clockwise or counter-clockwise by 90 or 180 degrees.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "add-page-numbers",
    name: "Add Page Numbers",
    description: "Add page numbers to your document with custom typography, size, and position.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "add-watermark",
    name: "Add Watermark",
    description: "Stamp custom text or image watermarks onto your PDF pages with rotation.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "crop-pdf",
    name: "Crop PDF",
    description: "Trim document margins and remove unnecessary white space evenly.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "edit-pdf",
    name: "Canva Live PDF Editor",
    description: "Click and edit any word in your PDF with exact matching fonts, plus text boxes, whiteout eraser, and highlights.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    badge: "Popular",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "pdf-forms",
    name: "PDF Forms Audit & Flatten",
    description: "Inspect interactive PDF form fields and flatten inputs into permanent print-ready document layers.",
    category: "edit",
    categoryLabel: "EDIT PDF",
    status: "active",
    accepts: [".pdf"],
  },

  // 6. PDF SECURITY
  {
    id: "protect-pdf",
    name: "Protect PDF",
    description: "Encrypt your PDF document with a secure password to prevent unauthorized access.",
    category: "security",
    categoryLabel: "PDF SECURITY",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "unlock-pdf",
    name: "Unlock PDF",
    description: "Remove PDF password security, giving you the freedom to use your file freely.",
    category: "security",
    categoryLabel: "PDF SECURITY",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "sign-pdf",
    name: "Sign PDF",
    description: "Stamp certified digital signature badges, timestamps, and verification metadata in-browser.",
    category: "security",
    categoryLabel: "PDF SECURITY",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "redact-pdf",
    name: "Redact PDF",
    description: "Permanently blackout sensitive terms with optional deep canvas rasterization to physically destroy vector text streams.",
    category: "security",
    categoryLabel: "PDF SECURITY",
    status: "active",
    accepts: [".pdf"],
  },
  {
    id: "compare-pdf",
    name: "Compare PDF",
    description: "Compare two PDF documents side by side to detect edits, additions, and diffs.",
    category: "security",
    categoryLabel: "PDF SECURITY",
    status: "active",
    accepts: [".pdf"],
  },

  // 7. PDF INTELLIGENCE (AI & Markdown)
  {
    id: "pdf-to-markdown",
    name: "PDF to Markdown",
    description: "Convert PDFs, DOCX, & spreadsheets into clean, LLM-ready Markdown tables with spatial alignment.",
    category: "intelligence",
    categoryLabel: "PDF INTELLIGENCE",
    badge: "AI",
    status: "active",
    accepts: [".pdf", ".docx", ".xlsx", ".csv", ".txt"],
  },
  {
    id: "ai-summarizer",
    name: "AI & NLP Summarizer",
    description: "Analyze document density, extract salient findings, and compute keyword frequency rankings in-browser.",
    category: "intelligence",
    categoryLabel: "PDF INTELLIGENCE",
    badge: "AI",
    status: "active",
    accepts: [".pdf", ".docx", ".txt"],
  },
  {
    id: "translate-pdf",
    name: "Translate PDF Layout",
    description: "Extract and structure document text into side-by-side bilingual translation layouts ready for localization.",
    category: "intelligence",
    categoryLabel: "PDF INTELLIGENCE",
    badge: "AI",
    status: "active",
    accepts: [".pdf", ".docx", ".txt"],
  },

  // 8. MEDIA & VIDEO DOWNLOADER
  {
    id: "video-downloader",
    name: "Universal Video Downloader",
    description: "Download ultra high-definition 4K, 2K, 1080p, 720p, 480p videos and audio from YouTube, Instagram Reels, X (Twitter), Facebook, TikTok, Reddit, and Vimeo with zero watermarks.",
    category: "media",
    categoryLabel: "VIDEO & MEDIA",
    badge: "4K",
    status: "active",
    accepts: [".mp4", ".mp3", "url"],
  },
];
