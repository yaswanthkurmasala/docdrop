import { TOOLS_REGISTRY, ToolDefinition } from "./tools-registry";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://docdrop-five.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "DocDrop";

export const GLOBAL_SEO_KEYWORDS: string[] = [
  "DocDrop",
  "free PDF tools online",
  "private PDF editor",
  "no upload PDF converter",
  "client-side PDF tools",
  "merge PDF online free",
  "split PDF pages",
  "compress PDF without losing quality",
  "PDF to Word converter free",
  "Word to PDF converter",
  "PDF to Excel converter",
  "Excel to PDF",
  "JPG to PDF",
  "PDF to JPG",
  "PDF to Markdown",
  "convert PDF for ChatGPT and Claude",
  "RAG document chunker",
  "OCR PDF online free",
  "unlock PDF password",
  "protect PDF with password",
  "redact PDF permanently",
  "sign PDF online free",
  "rotate PDF pages",
  "repair corrupted PDF",
  "compare two PDFs",
  "iLovePDF private alternative",
  "Smallpdf alternative no upload",
  "offline browser PDF studio",
];

interface ToolSeoProfile {
  seoTitle: string;
  seoDescription: string;
  h1: string;
  keywords: string[];
  howToSteps: string[];
  faqs: { question: string; answer: string }[];
}

const CUSTOM_TOOL_SEO: Record<string, Partial<ToolSeoProfile>> = {
  "merge-pdf": {
    seoTitle: "Merge PDF Online Free — Combine PDFs in Browser Without Uploading | DocDrop",
    seoDescription:
      "Merge multiple PDF files into one document 100% locally in your browser. Zero cloud uploads, instant speed, drag-and-drop reordering, and total file privacy.",
    keywords: [
      "merge pdf",
      "combine pdf files",
      "join pdf online free",
      "merge pdf without upload",
      "private pdf combiner",
      "ilovepdf merge alternative",
    ],
    howToSteps: [
      "Drop two or more PDF files directly into the DocDrop Merge workspace.",
      "Drag and reorder your PDF files into the exact sequence you need.",
      "Click Merge PDF and download your combined PDF instantly from local memory.",
    ],
  },
  "split-pdf": {
    seoTitle: "Split PDF Online Free — Extract Pages Privately in Browser | DocDrop",
    seoDescription:
      "Split PDF pages or extract page ranges into separate PDF files directly in your browser memory. Fast, free, and 100% private with zero server uploads.",
    keywords: [
      "split pdf",
      "separate pdf pages",
      "extract pages from pdf online",
      "cut pdf pages free",
      "split pdf into multiple files",
    ],
  },
  "compress-pdf": {
    seoTitle: "Compress PDF Online Free — Reduce PDF Size Without Losing Quality | DocDrop",
    seoDescription:
      "Shrink large PDF file sizes in seconds while preserving crisp text and images. Runs 100% client-side in browser RAM with zero server upload limits.",
    keywords: [
      "compress pdf",
      "reduce pdf file size",
      "shrink pdf online free",
      "pdf compressor 100kb",
      "optimize pdf without upload",
    ],
  },
  "pdf-to-word": {
    seoTitle: "PDF to Word Converter Free — Convert PDF to Editable DOCX | DocDrop",
    seoDescription:
      "Convert PDF documents into editable Microsoft Word (.docx) files privately inside your browser. Preserves paragraphs, headings, and layout with zero cloud leaks.",
    keywords: [
      "pdf to word",
      "convert pdf to docx online free",
      "editable word from pdf",
      "private pdf to word converter",
    ],
  },
  "pdf-to-excel": {
    seoTitle: "PDF to Excel Converter — Extract PDF Tables to XLSX Free | DocDrop",
    seoDescription:
      "Extract structured financial tables and spreadsheets from PDFs directly into clean Microsoft Excel (.xlsx) workbooks using spatial coordinate clustering.",
    keywords: [
      "pdf to excel",
      "convert pdf table to xlsx",
      "extract data from pdf to excel",
      "pdf bank statement to excel",
    ],
  },
  "pdf-to-markdown": {
    seoTitle: "PDF to Markdown Converter — LLM, ChatGPT, Claude & RAG Ready | DocDrop",
    seoDescription:
      "Convert PDFs, Word (.docx), and Excel spreadsheets into clean GitHub-Flavored Markdown with token counting and RAG chunking. Saves up to 40% LLM prompt tokens.",
    keywords: [
      "pdf to markdown",
      "pdf to md converter",
      "convert pdf for chatgpt",
      "rag document parser",
      "docx to markdown",
      "excel to markdown table",
    ],
  },
  "jpg-to-pdf": {
    seoTitle: "JPG to PDF Converter Online Free — Images to PDF Privately | DocDrop",
    seoDescription:
      "Convert JPG, PNG, and WebP images into a clean, print-ready PDF document in seconds. Works 100% offline in browser memory with zero file uploads.",
    keywords: [
      "jpg to pdf",
      "png to pdf",
      "image to pdf converter free",
      "photos to pdf online",
    ],
  },
  "word-to-pdf": {
    seoTitle: "Word to PDF Converter Online Free — DOCX to PDF in Browser | DocDrop",
    seoDescription:
      "Convert Microsoft Word (.docx, .doc) files to crisp PDFs directly inside your browser without uploading sensitive resumes or contracts to third-party servers.",
    keywords: [
      "word to pdf",
      "docx to pdf converter",
      "convert word document to pdf free",
    ],
  },
  "ocr-pdf": {
    seoTitle: "OCR PDF Online Free — Audit Text Layers & Extract Scanned Text | DocDrop",
    seoDescription:
      "Inspect PDF text layers, run local OCR text recognition, and create searchable PDFs privately without uploading confidential scans to external servers.",
    keywords: [
      "ocr pdf online",
      "searchable pdf converter",
      "extract text from scanned pdf",
      "private pdf ocr",
    ],
  },
  "protect-pdf": {
    seoTitle: "Protect PDF with Password — Encrypt PDF Locally Free | DocDrop",
    seoDescription:
      "Lock and encrypt PDF documents with strong password protection directly in your browser. Zero server exposure for confidential legal and financial PDFs.",
    keywords: [
      "protect pdf",
      "password protect pdf free",
      "encrypt pdf online",
      "lock pdf file",
    ],
  },
  "unlock-pdf": {
    seoTitle: "Unlock PDF Online Free — Remove PDF Password Privately | DocDrop",
    seoDescription:
      "Decrypt and remove password restrictions from your authorized PDF documents locally inside your browser sandbox with total privacy.",
    keywords: [
      "unlock pdf",
      "remove pdf password",
      "decrypt pdf online free",
    ],
  },
  "redact-pdf": {
    seoTitle: "Redact PDF Online Free — Permanently Blackout Sensitive Info | DocDrop",
    seoDescription:
      "Permanently blackout and rasterize sensitive names, SSNs, or account numbers from PDFs so vector text cannot be copied or recovered. 100% client-side.",
    keywords: [
      "redact pdf",
      "blackout pdf text",
      "remove sensitive info from pdf",
      "secure pdf redaction",
    ],
  },
  "sign-pdf": {
    seoTitle: "Sign PDF Online Free — Digital Signatures & Audit Stamps | DocDrop",
    seoDescription:
      "Sign contracts and agreements digitally inside your browser with verified timestamps and certified signatures. No account required, zero document uploads.",
    keywords: [
      "sign pdf online",
      "digital signature pdf free",
      "esign pdf privately",
    ],
  },
};

export function getToolSeoProfile(tool: ToolDefinition): ToolSeoProfile {
  const custom = CUSTOM_TOOL_SEO[tool.id] || {};
  const cleanName = tool.name.replace(/&amp;/g, "&");
  const formatsStr = tool.accepts.join(", ").toUpperCase();

  return {
    seoTitle:
      custom.seoTitle ||
      `${cleanName} Online Free — 100% Private In-Browser | ${SITE_NAME}`,
    seoDescription:
      custom.seoDescription ||
      `${tool.description} Runs 100% locally in your browser RAM with zero server uploads and total privacy.`,
    h1: `${cleanName} — Private & Instant`,
    keywords: custom.keywords || [
      cleanName.toLowerCase(),
      `${cleanName.toLowerCase()} online free`,
      `${cleanName.toLowerCase()} without upload`,
      `private ${cleanName.toLowerCase()}`,
      `${tool.categoryLabel.toLowerCase()} tool`,
      "no upload pdf tool",
      "docdrop",
    ],
    howToSteps: custom.howToSteps || [
      `Select or drag-and-drop your (${formatsStr}) file into the ${cleanName} instrument above.`,
      `Adjust your processing options — everything runs instantly inside your local browser memory.`,
      `Download your finished output immediately with zero cloud storage or server delays.`,
    ],
    faqs: custom.faqs || [
      {
        question: `Is ${cleanName} completely free and safe to use?`,
        answer: `Yes! ${cleanName} executes 100% inside your own web browser using WebAssembly and local RAM. Your files are never uploaded to any external cloud server, making it safe for sensitive legal, medical, and financial documents.`,
      },
      {
        question: `Which file formats does ${cleanName} support?`,
        answer: `${cleanName} accepts ${formatsStr} files directly via drag-and-drop or file picker without installing any desktop software.`,
      },
      {
        question: `Do I need to create an account to use ${cleanName}?`,
        answer: `No registration is required for everyday conversions on the free tier. You can start processing files immediately in seconds.`,
      },
    ],
  };
}

export function getRelatedTools(tool: ToolDefinition, limit = 6): ToolDefinition[] {
  const sameCategory = TOOLS_REGISTRY.filter(
    (t) => t.category === tool.category && t.id !== tool.id
  );
  const popularOthers = TOOLS_REGISTRY.filter(
    (t) => t.category !== tool.category && t.badge === "Popular"
  );
  return [...sameCategory, ...popularOthers].slice(0, limit);
}

export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description:
          "Private client-side PDF & document studio. Convert, merge, split, compress, sign, redact, and extract documents 100% locally inside your browser.",
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "DocDrop Studio",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "support@docdrop.app",
          contactType: "customer support",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "DocDrop — Private In-Browser PDF & Document Studio",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser (Windows, macOS, Linux, Android, iOS)",
        url: SITE_URL,
        image: `${SITE_URL}/logo.png`,
        description:
          "30+ client-side PDF instruments including Merge PDF, Split PDF, Compress PDF, PDF to Word, PDF to Excel, PDF to Markdown, OCR, Sign, Protect, and Redact — all executing locally in browser RAM with zero server uploads.",
        offers: [
          {
            "@type": "Offer",
            name: "Free Explorer",
            price: "0",
            priceCurrency: "INR",
          },
          {
            "@type": "Offer",
            name: "Quick Pass (48 Hours)",
            price: "99",
            priceCurrency: "INR",
          },
          {
            "@type": "Offer",
            name: "Pro Monthly",
            price: "199",
            priceCurrency: "INR",
          },
          {
            "@type": "Offer",
            name: "Early-Bird Lifetime",
            price: "1499",
            priceCurrency: "INR",
          },
        ],
        featureList: TOOLS_REGISTRY.map((t) => t.name).join(", "),
      },
      {
        "@type": "ItemList",
        name: "DocDrop PDF & Document Tools",
        numberOfItems: TOOLS_REGISTRY.length,
        itemListElement: TOOLS_REGISTRY.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: tool.name,
          url: `${SITE_URL}/tools/${tool.id}`,
        })),
      },
    ],
  };
}

export function buildToolJsonLd(tool: ToolDefinition, profile: ToolSeoProfile) {
  const toolUrl = `${SITE_URL}/tools/${tool.id}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tool.categoryLabel,
            item: `${SITE_URL}/#all-tools`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tool.name,
            item: toolUrl,
          },
        ],
      },
      {
        "@type": "WebApplication",
        name: `${tool.name} — ${SITE_NAME}`,
        url: toolUrl,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any Web Browser",
        description: profile.seoDescription,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: profile.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  };
}
