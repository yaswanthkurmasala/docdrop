"use client";

import React, { useState, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Scissors,
  RotateCw,
  Trash2,
  Stamp,
  Hash,
  Zap,
  Image as ImageIcon,
  Sparkles,
  Lock,
  Unlock,
  Layers,
  FileCode2,
  FileSpreadsheet,
  Crop,
  PenTool,
  GitCompare,
  Languages,
  EyeOff,
  Copy,
  Check,
  Wrench,
  ScanText,
  Presentation,
  Camera,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Undo2,
  Plus,
  Archive,
  Activity,
  Search,
  FileCheck,
  Type,
  BookOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Globe,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { StepWorkflowTracker } from "@/components/StepWorkflowTracker";
import {
  splitPdf,
  parseRangeToIndices,
  formatPagesToRange,
  type SplitMode,
  type SplitOptions,
  type SplitRangeItem,
  rotatePdf,
  removePagesFromPdf,
  parsePagesToRemove,
  formatPagesToRemoveString,
  watermarkPdf,
  WATERMARK_PRESETS,
  type WatermarkType,
  type WatermarkLayout,
  type WatermarkPosition,
  type WatermarkPageScope,
  type WatermarkColor,
  type WatermarkFont,
  addPageNumbersToPdf,
  PAGE_NUMBER_PRESETS,
  type PageNumberPosition,
  type PageNumberFormat,
  type PageNumberFont,
  type PageNumberColor,
  type PageNumberScope,
  type PageNumberStyle,
  translatePdfLayout,
  TRANSLATION_PRESETS,
  type SupportedLanguage,
  type BilingualLayoutMode,
  type DocumentSegment,
  type TranslateLayoutResult,
  convertImagesToPdf,
  compressPdf,
  repairPdf,
  type RepairStrategy,
  type RepairOptions,
  type RepairDiagnosticItem,
  type RepairPdfResult,
  auditPdfTextLayer,
  createSearchablePdf,
  type OcrAuditResult,
  type OcrPageAudit,
  type OcrAuditSummary,
  type PageClassification,
  protectPdf,
  unlockPdf,
  convertPdfToJpg,
  convertWordToPdf,
  convertExcelToPdf,
  convertHtmlToPdf,
  convertPdfToWord,
  type WordLayoutMode,
  type WordStyleTheme,
  type PdfToWordResult,
  convertPdfToExcel,
  convertPdfToPdfA,
  cropPdf,
  signPdf,
  type SignPdfResult,
  redactPdf,
  REDACT_PRESETS,
  type RedactTargetMode,
  type RedactFillColor,
  type RedactLabelStyle,
  type RedactPageScope,
  type PiiCategories,
  type ManualRedactionBox,
  type RedactPdfResult,
  organizePdfPages,
  annotatePdf,
  ANNOTATE_PRESETS,
  type AnnotatePosition,
  type AnnotateStyle,
  type AnnotateTone,
  type AnnotatePageScope,
  inspectAndFlattenPdfForms,
  comparePdf,
  aiSummarizePdf,
  extractTextFromPdf,
} from "@/lib/pdf-tools/suite";
import { callGeminiAi } from "@/lib/gemini";
import { getPdfPageCount } from "@/lib/pdf-tools/merge-pdf";
import { FREE_TIER_LIMITS, PRO_TIER_LIMITS } from "@/lib/pricing-plans";
import { SignPdfStudio, type SignStudioConfig } from "@/components/tools/SignPdfStudio";
import { useAuth } from "@/context/AuthContext";
import { logConversionRecord } from "@/lib/firebase/firestore";
import { uploadUserDocument } from "@/lib/firebase/storage";
import {
  createSamplePdfFile,
  createSampleImageFile,
  createSampleWordFile,
  createSampleExcelFile,
  createSampleProtectedPdfFile,
  createSampleHtmlFile,
} from "@/lib/pdf-tools/sample-pdf";

interface UniversalPdfToolProps {
  toolId: string;
  isPro: boolean;
  onOpenPricing: () => void;
}

interface ToolResult {
  pdfBytes?: Uint8Array;
  docxBlob?: Blob;
  excelBuffer?: ArrayBuffer;
  zipBlob?: Blob;
  images?: { pageNum: number; dataUrl: string }[];
  textContent?: string;
  summaryData?: {
    summary: string;
    keyTakeaways: string[];
    readingTimeMinutes: number;
    tokenCount: number;
    totalPages: number;
  };
  compareData?: {
    reportText: string;
    similarityScore: number;
    doc1Pages: number;
    doc2Pages: number;
    wordCount1: number;
    wordCount2: number;
  };
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    savingsBytes: number;
    savingsPercent: number;
    level: "recommended" | "extreme" | "light" | "custom";
    strategyUsed: "canvas_downsample" | "structural_stream" | "image_resample";
  };
  repairStats?: {
    originalSize: number;
    repairedSize: number;
    totalPages: number;
    healthScore: number;
    issuesFound: number;
    issuesRepaired: number;
    diagnostics: RepairDiagnosticItem[];
    strategyUsed: string;
  };
  ocrStats?: {
    audit: OcrAuditResult;
    mode: "audit" | "vision" | "searchable_pdf";
    searchablePdfBytes?: Uint8Array;
  };
  wordStats?: {
    result: PdfToWordResult;
    layoutMode: WordLayoutMode;
    styleTheme: WordStyleTheme;
  };
  translateStats?: TranslateLayoutResult;
  signStats?: SignPdfResult;
  redactStats?: RedactPdfResult;
  fileName: string;
  meta: string;
  type: "pdf" | "docx" | "xlsx" | "zip" | "text";
}

export interface OcrPagePreviewItem {
  pageNum: number;
  thumbnailUrl?: string;
  classification?: PageClassification;
  wordCount?: number;
  charCount?: number;
  snippet?: string;
}

interface OrganizePageThumb {
  id: string;
  origIndex: number;
  rotation: number;
  thumbnailUrl?: string;
}

interface SplitPageItem {
  pageNum: number;
  thumbnailUrl?: string;
  selected: boolean;
}

interface RemovePageItem {
  pageNum: number;
  thumbnailUrl?: string;
  markedForRemoval: boolean;
}

interface ImageStudioItem {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number;
}

const getToolDetails = (id: string) => {
  switch (id) {
    case "split-pdf":
      return { title: "Split PDF Document", desc: "Separate one page or a whole set for easy conversion into independent PDF files.", icon: Scissors, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50", accepts: ".pdf" };
    case "extract-pages":
      return { title: "Extract PDF Pages", desc: "Select and extract specific pages into a brand new independent PDF document.", icon: Scissors, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50", accepts: ".pdf" };
    case "rotate-pdf":
      return { title: "Rotate PDF Pages", desc: "Change orientation of PDF pages permanently (90°, 180°, 270°).", icon: RotateCw, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "remove-pages":
      return { title: "Remove PDF Pages", desc: "Delete unwanted pages visually and save the cleaned\u00A0document.", icon: Trash2, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50", accepts: ".pdf" };
    case "organize-pdf":
      return { title: "Organize PDF Pages", desc: "Reorder, duplicate or reverse pages in your PDF\u00A0document.", icon: Layers, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50", accepts: ".pdf" };
    case "scan-to-pdf":
      return { title: "Scan to PDF", desc: "Compile captured phone scans and camera documents into clean PDF pages.", icon: Camera, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50", accepts: "image/*,.pdf" };
    case "add-watermark":
      return { title: "Add Watermark", desc: "Stamp custom text watermark with transparency and rotation.", icon: Stamp, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "add-page-numbers":
      return { title: "Add Page Numbers", desc: "Number document pages with custom formats, Roman numerals, book-binding facing margins & styles.", icon: Hash, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "crop-pdf":
      return { title: "Crop PDF Margins", desc: "Trim excess document borders and margins evenly on all pages.", icon: Crop, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "compress-pdf":
      return { title: "Compress PDF", desc: "Optimize file weight using stream de-duplication in browser RAM.", icon: Zap, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50", accepts: ".pdf" };
    case "repair-pdf":
      return { title: "Repair Corrupted PDF", desc: "Recover and re-index damaged cross-reference tables and broken streams.", icon: Wrench, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50", accepts: ".pdf" };
    case "ocr-pdf":
      return { title: "OCR Text Layer Audit", desc: "Audit document text layers and extract digital text streams directly in-browser without external server exposure.", icon: ScanText, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50", accepts: ".pdf" };
    case "jpg-to-pdf":
      return { title: "Convert Images to PDF", desc: "Transform JPG, PNG, and WebP images into a single clean PDF\u00A0document.", icon: ImageIcon, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50", accepts: "image/*" };
    case "word-to-pdf":
      return { title: "Convert Word (DOCX) to PDF", desc: "Convert Microsoft Word documents (.docx) into clean, formatted PDFs.", icon: FileText, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50", accepts: ".docx,.doc" };
    case "excel-to-pdf":
      return { title: "Convert Excel (XLSX) to PDF", desc: "Transform spreadsheets and tables into beautiful PDF grids.", icon: FileSpreadsheet, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50", accepts: ".xlsx,.xls,.csv" };
    case "html-to-pdf":
      return { title: "Convert HTML to PDF", desc: "Render HTML code and web files into structured PDF documents.", icon: FileCode2, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50", accepts: ".html,.htm" };
    case "powerpoint-to-pdf":
      return { title: "Convert Slides to PDF", desc: "Compile slide images and presentations into a unified PDF presentation.", icon: Presentation, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50", accepts: "image/*,.pdf" };
    case "pdf-to-jpg":
      return { title: "Convert PDF to JPG Images", desc: "Render each PDF page into high-resolution JPG images and download as ZIP.", icon: ImageIcon, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
    case "pdf-to-word":
      return { title: "PDF to Word (.docx)", desc: "Convert PDF documents to editable Microsoft Word files.", icon: FileText, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
    case "pdf-to-excel":
      return { title: "Convert PDF to Excel (.xlsx)", desc: "Extract tabular rows, data columns, and text grids directly into Excel spreadsheets.", icon: FileSpreadsheet, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
    case "pdf-to-pdfa":
      return { title: "Convert PDF to PDF/A", desc: "Standardize document metadata for ISO-standard long-term archiving.", icon: ShieldCheck, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
    case "pdf-to-powerpoint":
      return { title: "Convert PDF to Slides (ZIP)", desc: "Extract slide images and decks from PDF for presentation editing.", icon: Presentation, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
    case "edit-pdf":
      return { title: "Edit PDF Document", desc: "Add text notes, shapes, and annotations directly to your PDF pages.", icon: PenTool, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "pdf-forms":
      return { title: "Fill PDF Forms", desc: "Fill interactive PDF form fields, checkboxes, and text inputs securely in-browser.", icon: FileText, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50", accepts: ".pdf" };
    case "protect-pdf":
      return { title: "Protect PDF with Password", desc: "Lock your PDF with 256-bit AES military-grade password encryption.", icon: Lock, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50", accepts: ".pdf" };
    case "unlock-pdf":
      return { title: "Unlock Protected PDF", desc: "Remove password protection and security restrictions in browser memory.", icon: Unlock, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50", accepts: ".pdf" };
    case "sign-pdf":
      return { title: "Sign PDF Document", desc: "Draw or type certified digital signatures, timestamps, and SHA-256 verification metadata in-browser.", icon: PenTool, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50", accepts: ".pdf" };
    case "redact-pdf":
      return { title: "Redact Sensitive PDF Content", desc: "Permanently blackout confidential numbers, addresses, and sensitive text.", icon: EyeOff, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50", accepts: ".pdf" };
    case "compare-pdf":
      return { title: "Compare Two PDF Documents", desc: "Side-by-side text difference and vocabulary similarity analysis.", icon: GitCompare, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50", accepts: ".pdf" };
    case "ai-summarizer":
      return { title: "AI PDF Summarizer", desc: "Generate executive summary, key insights, reading time, and token metrics.", icon: Sparkles, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50", accepts: ".pdf" };
    case "translate-pdf":
      return { title: "Translate PDF Layout", desc: "Extract and structure document text into side-by-side bilingual translation layouts ready for localization.", icon: Languages, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50", accepts: ".pdf" };
    default:
      return { title: id.replace(/-/g, " "), desc: "100% private in-browser document processing tool.", icon: FileText, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50", accepts: ".pdf" };
  }
};

export function UniversalPdfTool({ toolId, isPro, onOpenPricing }: UniversalPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [compareSecondFile, setCompareSecondFile] = useState<File | null>(null);
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCopiedText, setHasCopiedText] = useState(false);

  // Tool specific configurations
  const [splitRange, setSplitRange] = useState("1-2");
  const [splitMode, setSplitMode] = useState<"range" | "extract_all" | "split_every" | "multi_range">("range");
  const [splitPages, setSplitPages] = useState<SplitPageItem[]>([]);
  const [isLoadingSplitThumbnails, setIsLoadingSplitThumbnails] = useState(false);
  const [splitEveryCount, setSplitEveryCount] = useState<number>(1);
  const [splitMergeSingle, setSplitMergeSingle] = useState<boolean>(true);
  const [splitMultiRanges, setSplitMultiRanges] = useState<Array<{ id: string; name: string; from: number; to: number }>>([
    { id: "r-1", name: "Section 1", from: 1, to: 1 },
  ]);
  const [splitProgress, setSplitProgress] = useState<{ percent: number; message: string } | null>(null);
  const [rotateAngle, setRotateAngle] = useState(90);
  const [pagesToRemove, setPagesToRemove] = useState("2");
  const [removePagesList, setRemovePagesList] = useState<RemovePageItem[]>([]);
  const [isLoadingRemoveThumbnails, setIsLoadingRemoveThumbnails] = useState(false);
  const [removeProgress, setRemoveProgress] = useState<{ percent: number; message: string } | null>(null);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [watermarkLayout, setWatermarkLayout] = useState<WatermarkLayout>("single_center");
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("center");
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkColor, setWatermarkColor] = useState<WatermarkColor>("gray");
  const [watermarkFont, setWatermarkFont] = useState<WatermarkFont>("helvetica");
  const [watermarkFontSizeScale, setWatermarkFontSizeScale] = useState<"small" | "medium" | "large" | "auto">("auto");
  const [watermarkScope, setWatermarkScope] = useState<WatermarkPageScope>("all");
  const [watermarkCustomPages, setWatermarkCustomPages] = useState("1");
  const [watermarkActivePreset, setWatermarkActivePreset] = useState<string>("confidential");
  const [watermarkImageFile, setWatermarkImageFile] = useState<File | null>(null);
  const [watermarkImagePreview, setWatermarkImagePreview] = useState<string | null>(null);
  const [watermarkThumbnail, setWatermarkThumbnail] = useState<string | null>(null);
  const [isLoadingWatermarkThumbnail, setIsLoadingWatermarkThumbnail] = useState(false);
  const [watermarkProgress, setWatermarkProgress] = useState<{ percent: number; message: string } | null>(null);
  const [numberPosition, setNumberPosition] = useState<PageNumberPosition>("bottom-center");
  const [numberFormat, setNumberFormat] = useState<PageNumberFormat>("page_of_total");
  const [numberFont, setNumberFont] = useState<PageNumberFont>("helvetica");
  const [numberFontSize, setNumberFontSize] = useState<number>(10);
  const [numberColor, setNumberColor] = useState<PageNumberColor>("dark");
  const [numberStyle, setNumberStyle] = useState<PageNumberStyle>("plain");
  const [numberFacingPages, setNumberFacingPages] = useState<boolean>(false);
  const [numberSkipCover, setNumberSkipCover] = useState<boolean>(false);
  const [numberStartNumber, setNumberStartNumber] = useState<number>(1);
  const [numberScope, setNumberScope] = useState<PageNumberScope>("all");
  const [numberCustomPages, setNumberCustomPages] = useState("1");
  const [numberMargin, setNumberMargin] = useState<number>(28);
  const [numberCustomPrefix, setNumberCustomPrefix] = useState("");
  const [numberCustomSuffix, setNumberCustomSuffix] = useState("");
  const [numberActivePreset, setNumberActivePreset] = useState<string>("classic_bottom_center");
  const [numberPreviewPage, setNumberPreviewPage] = useState<1 | 2>(1);
  const [numberThumbnail1, setNumberThumbnail1] = useState<string | null>(null);
  const [numberThumbnail2, setNumberThumbnail2] = useState<string | null>(null);
  const [isLoadingNumberThumbnails, setIsLoadingNumberThumbnails] = useState(false);
  const [numberProgress, setNumberProgress] = useState<{ percent: number; message: string } | null>(null);
  const [cropMargin, setCropMargin] = useState(36);
  // Image & Scan Studio configurations
  const [imageItems, setImageItems] = useState<ImageStudioItem[]>([]);
  const [imagePageSize, setImagePageSize] = useState<"a4" | "fit" | "letter">("a4");
  const [imageOrientation, setImageOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [imageMargin, setImageMargin] = useState<"none" | "small" | "large">("none");
  const [imageProgress, setImageProgress] = useState<{ percent: number; message: string } | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);

  // Word to PDF studio options
  const [wordToPdfPageSize, setWordToPdfPageSize] = useState<"a4" | "letter">("a4");
  const [wordToPdfMargin, setWordToPdfMargin] = useState<"standard" | "compact" | "spacious">("standard");
  const [wordToPdfFont, setWordToPdfFont] = useState<"helvetica" | "times" | "courier">("helvetica");
  const [wordToPdfIncludeHeader, setWordToPdfIncludeHeader] = useState<boolean>(true);
  const [wordToPdfProgress, setWordToPdfProgress] = useState<{ percent: number; message: string } | null>(null);

  // Excel to PDF studio options
  const [excelOrientation, setExcelOrientation] = useState<"landscape" | "portrait">("landscape");
  const [excelTheme, setExcelTheme] = useState<"corporate_blue" | "minimalist" | "financial_green">("corporate_blue");
  const [excelShowGridlines, setExcelShowGridlines] = useState<boolean>(true);
  const [excelProgress, setExcelProgress] = useState<{ percent: number; message: string } | null>(null);

  // HTML to PDF studio options
  const [htmlPageSize, setHtmlPageSize] = useState<"a4" | "letter">("a4");
  const [htmlOrientation, setHtmlOrientation] = useState<"portrait" | "landscape">("portrait");
  const [htmlMargin, setHtmlMargin] = useState<"standard" | "compact" | "spacious">("standard");
  const [htmlProgress, setHtmlProgress] = useState<{ percent: number; message: string } | null>(null);

  // PDF to JPG studio options
  const [pdfToJpgDpi, setPdfToJpgDpi] = useState<number>(1.5);
  const [pdfToJpgFormat, setPdfToJpgFormat] = useState<"jpeg" | "png">("jpeg");
  const [pdfToJpgProgress, setPdfToJpgProgress] = useState<{ percent: number; message: string } | null>(null);

  // Rotate PDF studio options
  const [rotatePageScope, setRotatePageScope] = useState<"all" | "odd" | "even" | "custom">("all");
  const [rotateCustomPages, setRotateCustomPages] = useState<string>("1");
  const [rotateProgress, setRotateProgress] = useState<{ percent: number; message: string } | null>(null);

  // PDF to Excel studio options
  const [pdfToExcelIncludePage, setPdfToExcelIncludePage] = useState<boolean>(true);
  const [pdfToExcelProgress, setPdfToExcelProgress] = useState<{ percent: number; message: string } | null>(null);

  // PDF to PDF/A studio options
  const [pdfaLevel, setPdfaLevel] = useState<"PDF/A-1b" | "PDF/A-2b" | "PDF/A-3b">("PDF/A-2b");
  const [pdfaColorProfile, setPdfaColorProfile] = useState<"sRGB" | "DeviceCMYK">("sRGB");
  const [pdfaProgress, setPdfaProgress] = useState<{ percent: number; message: string } | null>(null);

  // PDF to PowerPoint studio options
  const [slidesDpi, setSlidesDpi] = useState<number>(1.5);
  const [slidesFormat, setSlidesFormat] = useState<"jpeg" | "png">("jpeg");
  const [slidesProgress, setSlidesProgress] = useState<{ percent: number; message: string } | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<"recommended" | "extreme" | "light" | "custom">("recommended");
  const [forceRasterize, setForceRasterize] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<{ percent: number; status: string } | null>(null);
  const [repairStrategy, setRepairStrategy] = useState<"smart" | "structural" | "stream_rebuild">("smart");
  const [repairProgress, setRepairProgress] = useState<{ percent: number; message: string } | null>(null);
  const [userPassword, setUserPassword] = useState("123456");
  const [unlockPassword, setUnlockPassword] = useState("123456");
  // Interactive Sign PDF Studio parameters
  const [signStudioConfig, setSignStudioConfig] = useState<SignStudioConfig>({
    signerName: "Authorized Signer",
    signerTitle: "Authorized Signatory",
    signerReason: "Approved & Accepted",
    mode: "draw",
    inkColor: "blue",
    cursiveStyle: "script",
    stampStyle: "pure",
    placements: [
      {
        id: "sig_default",
        pageNumber: 1,
        xPercent: 58,
        yPercent: 78,
        widthPercent: 28,
        heightPercent: 10,
        kind: "signature",
      },
    ],
  });
  const [signProgress, setSignProgress] = useState<{ percent: number; message: string } | null>(null);
  const [signResultData, setSignResultData] = useState<SignPdfResult | null>(null);

  // OCR Text Layer Audit parameters
  const [ocrMode, setOcrMode] = useState<"audit" | "vision" | "searchable_pdf">("audit");
  const [ocrPageRange, setOcrPageRange] = useState("all");
  const [ocrPagesList, setOcrPagesList] = useState<OcrPagePreviewItem[]>([]);
  const [isLoadingOcrThumbnails, setIsLoadingOcrThumbnails] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; message: string } | null>(null);
  const [ocrActiveTab, setOcrActiveTab] = useState<"text" | "pages" | "fonts">("text");
  const [ocrSearchQuery, setOcrSearchQuery] = useState("");

  // PDF to Word parameters
  const [wordLayoutMode, setWordLayoutMode] = useState<WordLayoutMode>("flowing");
  const [wordStyleTheme, setWordStyleTheme] = useState<WordStyleTheme>("modern");
  const [wordIncludePageNumbers, setWordIncludePageNumbers] = useState(true);
  const [wordDetectTables, setWordDetectTables] = useState(true);
  const [wordPageRange, setWordPageRange] = useState("all");
  const [wordProgress, setWordProgress] = useState<{ percent: number; message: string } | null>(null);

  // Extended interactive parameters for advanced tools
  const [organizeOrder, setOrganizeOrder] = useState("reverse");
  const [customPageSequence, setCustomPageSequence] = useState("1, 3, 2");
  const [organizePages, setOrganizePages] = useState<OrganizePageThumb[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [redactMode, setRedactMode] = useState<RedactTargetMode>("smart_pii");
  const [redactSearchTerm, setRedactSearchTerm] = useState("CONFIDENTIAL");
  const [redactPiiCategories, setRedactPiiCategories] = useState<PiiCategories>({
    ssn: true,
    email: true,
    phone: true,
    creditCard: true,
    ipAddress: false,
    financial: true,
  });
  const [redactFillColor, setRedactFillColor] = useState<RedactFillColor>("black");
  const [redactLabelStyle, setRedactLabelStyle] = useState<RedactLabelStyle>("pii_masked");
  const [redactCustomLabel, setRedactCustomLabel] = useState("");
  const [redactPageScope, setRedactPageScope] = useState<RedactPageScope>("all");
  const [redactCustomPages, setRedactCustomPages] = useState("1");
  const [redactPageNum, setRedactPageNum] = useState(1);
  const [redactRasterize, setRedactRasterize] = useState(true);
  const [redactActivePreset, setRedactActivePreset] = useState("pii_auto_purge");
  const [redactManualBoxes, setRedactManualBoxes] = useState<ManualRedactionBox[]>([]);
  const [redactThumbnailUrl, setRedactThumbnailUrl] = useState<string | null>(null);
  const [redactTotalPages, setRedactTotalPages] = useState(1);
  const [isLoadingRedactThumb, setIsLoadingRedactThumb] = useState(false);
  const [redactProgress, setRedactProgress] = useState<{ percent: number; message: string } | null>(null);
  const [isDrawingRedactBox, setIsDrawingRedactBox] = useState(false);
  const [redactDragStart, setRedactDragStart] = useState<{ x: number; y: number } | null>(null);
  const [redactCurrentDrag, setRedactCurrentDrag] = useState<{ x: number; y: number } | null>(null);
  const redactCanvasRef = useRef<HTMLDivElement>(null);
  const [annotationText, setAnnotationText] = useState("APPROVED FOR RELEASE");
  const [annotationSubtitle, setAnnotationSubtitle] = useState("DOCDROP AUDIT COMPLIANT");
  const [annotationPosition, setAnnotationPosition] = useState<AnnotatePosition>("top-right");
  const [annotationTone, setAnnotationTone] = useState<AnnotateTone>("approved");
  const [annotationStyle, setAnnotationStyle] = useState<AnnotateStyle>("rubber_stamp");
  const [annotationScope, setAnnotationScope] = useState<AnnotatePageScope>("all");
  const [annotationCustomPages, setAnnotationCustomPages] = useState("1");
  const [annotationRotation, setAnnotationRotation] = useState<number>(-12);
  const [annotationOpacity, setAnnotationOpacity] = useState<number>(0.95);
  const [annotationIncludeDate, setAnnotationIncludeDate] = useState<boolean>(true);
  const [annotationActivePreset, setAnnotationActivePreset] = useState<string>("approved");
  const [annotatePreviewThumbnail, setAnnotatePreviewThumbnail] = useState<string | null>(null);
  const [isLoadingAnnotateThumbnail, setIsLoadingAnnotateThumbnail] = useState(false);
  const [annotateProgress, setAnnotateProgress] = useState<{ percent: number; message: string } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("Spanish");
  const [translateLayoutMode, setTranslateLayoutMode] = useState<BilingualLayoutMode>("side_by_side");
  const [translateIncludePdf, setTranslateIncludePdf] = useState<boolean>(true);
  const [translateActivePreset, setTranslateActivePreset] = useState<string>("bilingual_es");
  const [translateProgress, setTranslateProgress] = useState<{ percent: number; message: string } | null>(null);
  const [translateActiveTab, setTranslateActiveTab] = useState<"side_by_side" | "markdown" | "html_preview" | "json">("side_by_side");
  const [translateSearchQuery, setTranslateSearchQuery] = useState<string>("");
  const [translateFilterType, setTranslateFilterType] = useState<"all" | "heading" | "paragraph" | "bullet">("all");

  const { user } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [cloudBackupSuccess, setCloudBackupSuccess] = useState(false);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compareInputRef = useRef<HTMLInputElement | null>(null);
  const details = getToolDetails(toolId);
  const IconComponent = details.icon;

  const isMultiFileMode = ["jpg-to-pdf", "scan-to-pdf", "powerpoint-to-pdf"].includes(toolId);
  const isCompareMode = toolId === "compare-pdf";

  const loadOrganizeThumbnails = async (pdfFile: File) => {
    setIsLoadingThumbnails(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const count = doc.numPages;
      const initial: OrganizePageThumb[] = [];
      for (let i = 0; i < count; i++) {
        initial.push({
          id: `p-${i}-${Date.now()}-${Math.random()}`,
          origIndex: i,
          rotation: 0,
        });
      }
      setOrganizePages(initial);

      // Render thumbnails asynchronously in order
      for (let i = 1; i <= Math.min(count, 50); i++) {
        try {
          const p = await doc.getPage(i);
          const viewport = p.getViewport({ scale: 0.35 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await (p.render({ canvasContext: ctx as any, viewport, canvas } as any) as any).promise;
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.75);
            canvas.width = 1;
            canvas.height = 1;
            setOrganizePages((prev) =>
              prev.map((item) =>
                item.origIndex === i - 1 && !item.thumbnailUrl
                  ? { ...item, thumbnailUrl: thumbUrl }
                  : item
              )
            );
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load organize thumbnails:", err);
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const moveOrganizePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= organizePages.length) return;
    const updated = [...organizePages];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setOrganizePages(updated);
  };

  const rotateOrganizePage = (idx: number) => {
    setOrganizePages((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const deleteOrganizePage = (idx: number) => {
    if (organizePages.length <= 1) return;
    setOrganizePages((prev) => prev.filter((_, i) => i !== idx));
  };

  const duplicateOrganizePage = (idx: number) => {
    const item = organizePages[idx];
    const clone: OrganizePageThumb = {
      ...item,
      id: `p-${item.origIndex}-${Date.now()}-${Math.random()}`,
    };
    const updated = [...organizePages];
    updated.splice(idx + 1, 0, clone);
    setOrganizePages(updated);
  };

  const rotateImageItem = (id: string) => {
    setImageItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const moveImageItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= imageItems.length) return;
    setImageItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    setMultiFiles((prev) => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const deleteImageItem = (id: string) => {
    const itemToDelete = imageItems.find((i) => i.id === id);
    if (itemToDelete?.previewUrl) {
      try { URL.revokeObjectURL(itemToDelete.previewUrl); } catch {}
    }
    setImageItems((prev) => prev.filter((item) => item.id !== id));
    setMultiFiles((prev) => prev.filter((f) => f !== itemToDelete?.file));
  };

  const loadSplitThumbnails = async (pdfFile: File) => {
    setIsLoadingSplitThumbnails(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const count = doc.numPages;

      const initialIndices = parseRangeToIndices(splitRange, count);
      const initial: SplitPageItem[] = [];
      for (let i = 1; i <= count; i++) {
        initial.push({
          pageNum: i,
          selected: initialIndices.includes(i - 1),
        });
      }
      setSplitPages(initial);

      if (count >= 2) {
        const mid = Math.floor(count / 2);
        setSplitMultiRanges([
          { id: "r-1", name: "Part 1", from: 1, to: mid },
          { id: "r-2", name: "Part 2", from: mid + 1, to: count },
        ]);
      } else {
        setSplitMultiRanges([
          { id: "r-1", name: "Part 1", from: 1, to: 1 },
        ]);
      }

      for (let i = 1; i <= Math.min(count, 50); i++) {
        try {
          const p = await doc.getPage(i);
          const viewport = p.getViewport({ scale: 0.35 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await (p.render({ canvasContext: ctx as any, viewport, canvas } as any) as any).promise;
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.75);
            canvas.width = 1;
            canvas.height = 1;
            setSplitPages((prev) =>
              prev.map((item) =>
                item.pageNum === i && !item.thumbnailUrl
                  ? { ...item, thumbnailUrl: thumbUrl }
                  : item
              )
            );
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load split thumbnails:", err);
    } finally {
      setIsLoadingSplitThumbnails(false);
    }
  };

  const toggleSplitPage = (pageNum: number) => {
    setSplitPages((prev) => {
      const updated = prev.map((p) => (p.pageNum === pageNum ? { ...p, selected: !p.selected } : p));
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRange(formatPagesToRange(selectedNums));
      return updated;
    });
  };

  const handleSplitRangeTextChange = (val: string) => {
    setSplitRange(val);
    const count = splitPages.length || 999;
    const activeIndices = parseRangeToIndices(val, count);
    setSplitPages((prev) =>
      prev.map((p) => ({
        ...p,
        selected: activeIndices.includes(p.pageNum - 1),
      }))
    );
  };

  const selectAllSplitPages = (select: boolean) => {
    setSplitPages((prev) => {
      const updated = prev.map((p) => ({ ...p, selected: select }));
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRange(formatPagesToRange(selectedNums));
      return updated;
    });
  };

  const selectEvenSplitPages = () => {
    setSplitPages((prev) => {
      const updated = prev.map((p) => ({ ...p, selected: p.pageNum % 2 === 0 }));
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRange(formatPagesToRange(selectedNums));
      return updated;
    });
  };

  const selectOddSplitPages = () => {
    setSplitPages((prev) => {
      const updated = prev.map((p) => ({ ...p, selected: p.pageNum % 2 !== 0 }));
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRange(formatPagesToRange(selectedNums));
      return updated;
    });
  };

  const invertSplitPages = () => {
    setSplitPages((prev) => {
      const updated = prev.map((p) => ({ ...p, selected: !p.selected }));
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRange(formatPagesToRange(selectedNums));
      return updated;
    });
  };

  const addMultiRangeRow = () => {
    const total = splitPages.length || 4;
    setSplitMultiRanges((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}-${Math.random()}`,
        name: `Section ${prev.length + 1}`,
        from: 1,
        to: Math.min(2, total),
      },
    ]);
  };

  const removeMultiRangeRow = (id: string) => {
    if (splitMultiRanges.length <= 1) return;
    setSplitMultiRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const updateMultiRangeRow = (id: string, updates: Partial<{ name: string; from: number; to: number }>) => {
    setSplitMultiRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const loadRemoveThumbnails = async (pdfFile: File) => {
    setIsLoadingRemoveThumbnails(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const count = doc.numPages;

      const initialMarked = parsePagesToRemove(pagesToRemove, count);
      const initial: RemovePageItem[] = [];
      for (let i = 1; i <= count; i++) {
        initial.push({
          pageNum: i,
          markedForRemoval: initialMarked.includes(i),
        });
      }
      setRemovePagesList(initial);

      for (let i = 1; i <= Math.min(count, 50); i++) {
        try {
          const p = await doc.getPage(i);
          const viewport = p.getViewport({ scale: 0.35 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await (p.render({ canvasContext: ctx as any, viewport, canvas } as any) as any).promise;
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.75);
            canvas.width = 1;
            canvas.height = 1;
            setRemovePagesList((prev) =>
              prev.map((item) =>
                item.pageNum === i && !item.thumbnailUrl
                  ? { ...item, thumbnailUrl: thumbUrl }
                  : item
              )
            );
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load remove thumbnails:", err);
    } finally {
      setIsLoadingRemoveThumbnails(false);
    }
  };

  const loadOcrThumbnailsAndPreflight = async (pdfFile: File) => {
    setIsLoadingOcrThumbnails(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const count = doc.numPages;

      const initial: OcrPagePreviewItem[] = [];
      for (let i = 1; i <= count; i++) {
        initial.push({ pageNum: i });
      }
      setOcrPagesList(initial);

      for (let i = 1; i <= Math.min(count, 50); i++) {
        try {
          const p = await doc.getPage(i);
          const textContent = await p.getTextContent();
          const str = textContent.items.map((it: any) => ("str" in it ? it.str : "")).join(" ").trim();
          const charCount = str.length;
          const words = str.split(/\s+/).filter(Boolean);
          const wordCount = words.length;
          const snippet = str.slice(0, 140);

          const viewport = p.getViewport({ scale: 0.35 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext("2d");
          let thumbUrl: string | undefined;
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await (p.render({ canvasContext: ctx as any, viewport, canvas } as any) as any).promise;
            thumbUrl = canvas.toDataURL("image/jpeg", 0.75);
            canvas.width = 1;
            canvas.height = 1;
          }

          const classification: PageClassification =
            charCount >= 40 ? "digital" : charCount > 0 ? "hybrid" : "scanned";

          setOcrPagesList((prev) =>
            prev.map((item) =>
              item.pageNum === i
                ? {
                    ...item,
                    thumbnailUrl: thumbUrl || item.thumbnailUrl,
                    classification,
                    wordCount,
                    charCount,
                    snippet,
                  }
                : item
            )
          );
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load OCR preflight thumbnails:", err);
    } finally {
      setIsLoadingOcrThumbnails(false);
    }
  };

  const loadAnnotateThumbnail = async (pdfFile: File) => {
    setIsLoadingAnnotateThumbnail(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        setAnnotatePreviewThumbnail(canvas.toDataURL("image/webp", 0.85));
      }
    } catch (e) {
      console.warn("Could not load annotation page preview:", e);
    } finally {
      setIsLoadingAnnotateThumbnail(false);
    }
  };

  const loadWatermarkThumbnail = async (pdfFile: File) => {
    setIsLoadingWatermarkThumbnail(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        setWatermarkThumbnail(canvas.toDataURL("image/webp", 0.85));
      }
    } catch (e) {
      console.warn("Could not load watermark page preview:", e);
    } finally {
      setIsLoadingWatermarkThumbnail(false);
    }
  };

  const loadNumberThumbnails = async (pdfFile: File) => {
    setIsLoadingNumberThumbnails(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;

      if (doc.numPages >= 1) {
        const page1 = await doc.getPage(1);
        const viewport1 = page1.getViewport({ scale: 0.6 });
        const canvas1 = document.createElement("canvas");
        const ctx1 = canvas1.getContext("2d");
        if (ctx1) {
          canvas1.width = viewport1.width;
          canvas1.height = viewport1.height;
          await (page1 as any).render({ canvasContext: ctx1, viewport: viewport1 }).promise;
          setNumberThumbnail1(canvas1.toDataURL("image/webp", 0.85));
        }
      }

      if (doc.numPages >= 2) {
        const page2 = await doc.getPage(2);
        const viewport2 = page2.getViewport({ scale: 0.6 });
        const canvas2 = document.createElement("canvas");
        const ctx2 = canvas2.getContext("2d");
        if (ctx2) {
          canvas2.width = viewport2.width;
          canvas2.height = viewport2.height;
          await (page2 as any).render({ canvasContext: ctx2, viewport: viewport2 }).promise;
          setNumberThumbnail2(canvas2.toDataURL("image/webp", 0.85));
        }
      } else {
        setNumberThumbnail2(null);
      }
    } catch (e) {
      console.warn("Could not load page numbers thumbnails:", e);
    } finally {
      setIsLoadingNumberThumbnails(false);
    }
  };

  const loadRedactThumbnail = async (pdfFile: File, pageIndex = 1) => {
    setIsLoadingRedactThumb(true);
    try {
      const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) => m.loadPdfJs());
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      setRedactTotalPages(doc.numPages);
      const targetP = Math.max(1, Math.min(pageIndex, doc.numPages));
      setRedactPageNum(targetP);
      const page = await doc.getPage(targetP);
      const viewport = page.getViewport({ scale: 0.85 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        setRedactThumbnailUrl(canvas.toDataURL("image/webp", 0.85));
      }
    } catch (e) {
      console.warn("Could not load redact thumbnail:", e);
    } finally {
      setIsLoadingRedactThumb(false);
    }
  };

  const handleRedactPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!redactCanvasRef.current) return;
    const rect = redactCanvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setRedactDragStart({ x, y });
    setRedactCurrentDrag({ x, y });
    setIsDrawingRedactBox(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRedactPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRedactBox || !redactCanvasRef.current) return;
    const rect = redactCanvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setRedactCurrentDrag({ x, y });
  };

  const handleRedactPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRedactBox || !redactDragStart || !redactCurrentDrag) {
      setIsDrawingRedactBox(false);
      setRedactDragStart(null);
      setRedactCurrentDrag(null);
      return;
    }
    const xPct = Math.min(redactDragStart.x, redactCurrentDrag.x);
    const yPct = Math.min(redactDragStart.y, redactCurrentDrag.y);
    const wPct = Math.abs(redactCurrentDrag.x - redactDragStart.x);
    const hPct = Math.abs(redactCurrentDrag.y - redactDragStart.y);

    if (wPct > 3 && hPct > 2) {
      const pdfX = (xPct / 100) * 595.28;
      const pdfY = ((100 - (yPct + hPct)) / 100) * 841.89;
      const pdfW = (wPct / 100) * 595.28;
      const pdfH = (hPct / 100) * 841.89;

      const newBox: ManualRedactionBox = {
        pageNum: redactPageNum,
        x: Math.round(pdfX),
        y: Math.round(pdfY),
        width: Math.round(pdfW),
        height: Math.round(pdfH),
        label: `Box ${redactManualBoxes.length + 1}`,
      };
      setRedactManualBoxes((prev) => [...prev, newBox]);
    }

    setIsDrawingRedactBox(false);
    setRedactDragStart(null);
    setRedactCurrentDrag(null);
  };

  const clearCurrentPageBoxes = () => {
    setRedactManualBoxes((prev) => prev.filter((b) => b.pageNum !== redactPageNum));
  };

  const toggleRemovePage = (pageNum: number) => {
    setRemovePagesList((prev) => {
      const updated = prev.map((p) =>
        p.pageNum === pageNum ? { ...p, markedForRemoval: !p.markedForRemoval } : p
      );
      const markedNums = updated.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
      setPagesToRemove(formatPagesToRemoveString(markedNums));
      return updated;
    });
  };

  const handleRemoveTextChange = (val: string) => {
    setPagesToRemove(val);
    const count = removePagesList.length || 999;
    const activeMarked = parsePagesToRemove(val, count);
    setRemovePagesList((prev) =>
      prev.map((p) => ({
        ...p,
        markedForRemoval: activeMarked.includes(p.pageNum),
      }))
    );
  };

  const markEvenPagesForRemoval = () => {
    setRemovePagesList((prev) => {
      const updated = prev.map((p) => ({ ...p, markedForRemoval: p.pageNum % 2 === 0 }));
      const markedNums = updated.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
      setPagesToRemove(formatPagesToRemoveString(markedNums));
      return updated;
    });
  };

  const markOddPagesForRemoval = () => {
    setRemovePagesList((prev) => {
      const updated = prev.map((p) => ({ ...p, markedForRemoval: p.pageNum % 2 !== 0 }));
      const markedNums = updated.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
      setPagesToRemove(formatPagesToRemoveString(markedNums));
      return updated;
    });
  };

  const markFirstPageForRemoval = () => {
    setRemovePagesList((prev) => {
      const updated = prev.map((p) => ({ ...p, markedForRemoval: p.pageNum === 1 }));
      const markedNums = updated.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
      setPagesToRemove(formatPagesToRemoveString(markedNums));
      return updated;
    });
  };

  const markLastPageForRemoval = () => {
    const total = removePagesList.length;
    setRemovePagesList((prev) => {
      const updated = prev.map((p) => ({ ...p, markedForRemoval: p.pageNum === total }));
      const markedNums = updated.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
      setPagesToRemove(formatPagesToRemoveString(markedNums));
      return updated;
    });
  };

  const clearRemoveSelection = () => {
    setRemovePagesList((prev) => prev.map((p) => ({ ...p, markedForRemoval: false })));
    setPagesToRemove("");
  };

  const resetState = () => {
    setFile(null);
    setCompareSecondFile(null);
    setMultiFiles([]);
    imageItems.forEach((it) => {
      try { URL.revokeObjectURL(it.previewUrl); } catch {}
    });
    setImageItems([]);
    setImageProgress(null);
    setImagePageSize("a4");
    setImageOrientation("auto");
    setImageMargin("none");
    setWordToPdfPageSize("a4");
    setWordToPdfMargin("standard");
    setWordToPdfFont("helvetica");
    setWordToPdfIncludeHeader(true);
    setWordToPdfProgress(null);
    setExcelOrientation("landscape");
    setExcelTheme("corporate_blue");
    setExcelShowGridlines(true);
    setExcelProgress(null);
    setHtmlPageSize("a4");
    setHtmlOrientation("portrait");
    setHtmlMargin("standard");
    setHtmlProgress(null);
    setPdfToJpgDpi(1.5);
    setPdfToJpgFormat("jpeg");
    setPdfToJpgProgress(null);
    setRotatePageScope("all");
    setRotateCustomPages("1");
    setRotateProgress(null);
    setPdfToExcelIncludePage(true);
    setPdfToExcelProgress(null);
    setPdfaLevel("PDF/A-2b");
    setPdfaColorProfile("sRGB");
    setPdfaProgress(null);
    setSlidesDpi(1.5);
    setSlidesFormat("jpeg");
    setSlidesProgress(null);
    setResult(null);
    setError(null);
    setCloudBackupSuccess(false);
    setIsBackingUp(false);
    setCloudUrl(null);
    setCompressionProgress(null);
    setForceRasterize(false);
    setOrganizePages([]);
    setIsLoadingThumbnails(false);
    setDraggedPageIndex(null);
    setSplitPages([]);
    setIsLoadingSplitThumbnails(false);
    setSplitProgress(null);
    setRemovePagesList([]);
    setIsLoadingRemoveThumbnails(false);
    setRemoveProgress(null);
    setRepairProgress(null);
    setRepairStrategy("smart");
    setOcrPagesList([]);
    setIsLoadingOcrThumbnails(false);
    setOcrProgress(null);
    setOcrMode("audit");
    setOcrPageRange("all");
    setOcrActiveTab("text");
    setOcrSearchQuery("");
    setWordLayoutMode("flowing");
    setWordStyleTheme("modern");
    setWordIncludePageNumbers(true);
    setWordDetectTables(true);
    setWordPageRange("all");
    setWordProgress(null);
    setAnnotateProgress(null);
    setWatermarkImageFile(null);
    setWatermarkImagePreview(null);
    setWatermarkThumbnail(null);
    setWatermarkProgress(null);
    setNumberPosition("bottom-center");
    setNumberFormat("page_of_total");
    setNumberFont("helvetica");
    setNumberFontSize(10);
    setNumberColor("dark");
    setNumberStyle("plain");
    setNumberFacingPages(false);
    setNumberSkipCover(false);
    setNumberStartNumber(1);
    setNumberScope("all");
    setNumberCustomPages("1");
    setNumberMargin(28);
    setNumberCustomPrefix("");
    setNumberCustomSuffix("");
    setNumberActivePreset("classic_bottom_center");
    setNumberPreviewPage(1);
    setNumberThumbnail1(null);
    setNumberThumbnail2(null);
    setIsLoadingNumberThumbnails(false);
    setNumberProgress(null);
    setTargetLanguage("Spanish");
    setTranslateLayoutMode("side_by_side");
    setTranslateIncludePdf(true);
    setTranslateActivePreset("bilingual_es");
    setTranslateProgress(null);
    setTranslateActiveTab("side_by_side");
    setTranslateSearchQuery("");
    setTranslateFilterType("all");
    setSignStudioConfig({
      signerName: "Authorized Signer",
      signerTitle: "Authorized Signatory",
      signerReason: "Approved & Accepted",
      mode: "draw",
      inkColor: "blue",
      cursiveStyle: "script",
      stampStyle: "pure",
      placements: [
        {
          id: "sig_default",
          pageNumber: 1,
          xPercent: 58,
          yPercent: 78,
          widthPercent: 28,
          heightPercent: 10,
          kind: "signature",
        },
      ],
    });
    setSignProgress(null);
    setSignResultData(null);
    setRedactMode("smart_pii");
    setRedactSearchTerm("CONFIDENTIAL");
    setRedactPiiCategories({
      ssn: true,
      email: true,
      phone: true,
      creditCard: true,
      ipAddress: false,
      financial: true,
    });
    setRedactFillColor("black");
    setRedactLabelStyle("pii_masked");
    setRedactCustomLabel("");
    setRedactPageScope("all");
    setRedactCustomPages("1");
    setRedactPageNum(1);
    setRedactRasterize(true);
    setRedactActivePreset("pii_auto_purge");
    setRedactManualBoxes([]);
    setRedactThumbnailUrl(null);
    setRedactTotalPages(1);
    setIsLoadingRedactThumb(false);
    setRedactProgress(null);
    setIsDrawingRedactBox(false);
    setRedactDragStart(null);
    setRedactCurrentDrag(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (compareInputRef.current) compareInputRef.current.value = "";
  };

  const handleCloudBackup = async () => {
    if (!user?.id || !result) return;
    setIsBackingUp(true);
    try {
      let blob: Blob;
      if (result.pdfBytes) {
        blob = new Blob([result.pdfBytes as any], { type: "application/pdf" });
      } else if (result.docxBlob) {
        blob = result.docxBlob;
      } else if (result.zipBlob) {
        blob = result.zipBlob;
      } else if (result.excelBuffer) {
        blob = new Blob([result.excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else if (result.textContent) {
        blob = new Blob([result.textContent], { type: "text/markdown;charset=utf-8" });
      } else {
        throw new Error("No output file available to backup");
      }

      const res = await uploadUserDocument(user.id, blob, result.fileName, "exports");
      if (res) {
        setCloudUrl(res.downloadUrl);
        setCloudBackupSuccess(true);
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err: any) {
      setError("Cloud backup failed: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setError(null);

    if (isMultiFileMode) {
      const filesArr = Array.from(selectedFiles);
      const newItems: ImageStudioItem[] = filesArr.map((f, i) => ({
        id: `img-${Date.now()}-${i}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        rotation: 0,
      }));
      setImageItems((prev) => [...prev, ...newItems]);
      setMultiFiles((prev) => [...prev, ...filesArr]);
    } else {
      const f = selectedFiles[0];
      setFile(f);
      if (toolId === "organize-pdf") {
        loadOrganizeThumbnails(f);
      } else if (toolId === "split-pdf" || toolId === "extract-pages") {
        loadSplitThumbnails(f);
      } else if (toolId === "remove-pages") {
        loadRemoveThumbnails(f);
      } else if (toolId === "ocr-pdf") {
        loadOcrThumbnailsAndPreflight(f);
      } else if (toolId === "edit-pdf") {
        loadAnnotateThumbnail(f);
      } else if (toolId === "add-watermark") {
        loadWatermarkThumbnail(f);
      } else if (toolId === "add-page-numbers") {
        loadNumberThumbnails(f);
      } else if (toolId === "redact-pdf") {
        loadRedactThumbnail(f, 1);
      }
    }
  };

  const handleLoadSample = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      if (toolId === "word-to-pdf") {
        const wordFile = await createSampleWordFile("Sample_Strategy_Brief.docx");
        setFile(wordFile);
      } else if (toolId === "excel-to-pdf") {
        const excelFile = await createSampleExcelFile("Sample_Financial_Table.xlsx");
        setFile(excelFile);
      } else if (toolId === "html-to-pdf") {
        const htmlFile = createSampleHtmlFile("Sample_Webpage.html");
        setFile(htmlFile);
      } else if (isMultiFileMode) {
        const img1 = await createSampleImageFile("Sample_Scan_1.png");
        const img2 = await createSampleImageFile("Sample_Scan_2.png");
        const items: ImageStudioItem[] = [img1, img2].map((f, i) => ({
          id: `sample-img-${i}-${Date.now()}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
          rotation: 0,
        }));
        setImageItems(items);
        setMultiFiles([img1, img2]);
      } else if (toolId === "unlock-pdf") {
        const lockedPdf = await createSampleProtectedPdfFile("Locked_Contract_pass_123456.pdf", "123456");
        setFile(lockedPdf);
        setUnlockPassword("123456");
      } else if (toolId === "compare-pdf") {
        const pdfA = await createSamplePdfFile("Contract_Version_1.pdf", 3);
        const pdfB = await createSamplePdfFile("Contract_Version_2_Updated.pdf", 3);
        setFile(pdfA);
        setCompareSecondFile(pdfB);
      } else {
        const samplePdf = await createSamplePdfFile("Quarterly_Report_Sample.pdf", 4);
        setFile(samplePdf);
        if (toolId === "organize-pdf") {
          loadOrganizeThumbnails(samplePdf);
        } else if (toolId === "split-pdf" || toolId === "extract-pages") {
          loadSplitThumbnails(samplePdf);
        } else if (toolId === "remove-pages") {
          loadRemoveThumbnails(samplePdf);
        } else if (toolId === "ocr-pdf") {
          loadOcrThumbnailsAndPreflight(samplePdf);
        } else if (toolId === "edit-pdf") {
          loadAnnotateThumbnail(samplePdf);
        } else if (toolId === "add-watermark") {
          loadWatermarkThumbnail(samplePdf);
        } else if (toolId === "add-page-numbers") {
          loadNumberThumbnails(samplePdf);
        } else if (toolId === "redact-pdf") {
          loadRedactThumbnail(samplePdf, 1);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load sample document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeTool = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Plan tier validation
      const maxMb = isPro ? PRO_TIER_LIMITS.maxFileSizeMb : FREE_TIER_LIMITS.maxFileSizeMb;
      if (file && file.size > maxMb * 1024 * 1024) {
        throw new Error(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMb}MB limit for Free tier. Upgrade to Quick Pass (₹49) or Pro for large files up to 500MB.`
        );
      }
      if (
        file &&
        !isPro &&
        file.name.toLowerCase().endsWith(".pdf") &&
        toolId !== "unlock-pdf" &&
        toolId !== "repair-pdf"
      ) {
        const pageCount = await getPdfPageCount(file).catch(() => 0);
        if (pageCount > FREE_TIER_LIMITS.maxPages) {
          throw new Error(
            `Document has ${pageCount} pages, exceeding the ${FREE_TIER_LIMITS.maxPages}-page limit for Free tier. Upgrade to Quick Pass (₹49) or Pro for up to 300+ pages.`
          );
        }
      }
      if (isMultiFileMode && !isPro && multiFiles.length > FREE_TIER_LIMITS.maxBatchFiles) {
        throw new Error(
          `Free tier supports converting up to ${FREE_TIER_LIMITS.maxBatchFiles} files at once. You selected ${multiFiles.length} files. Upgrade to Quick Pass (₹49) or Pro for unlimited batch conversion.`
        );
      }

      if (isMultiFileMode) {
        const targetFiles = imageItems.length > 0 ? imageItems.map((item) => item.file) : multiFiles;
        if (targetFiles.length === 0) throw new Error("Please select images or document photos to convert.");
        const rotations = imageItems.length > 0 ? imageItems.map((item) => item.rotation) : [];

        setImageProgress({ percent: 15, message: "Setting up image frames & orientation..." });
        const res = await convertImagesToPdf(targetFiles, {
          pageSize: imagePageSize,
          orientation: imageOrientation,
          margin: imageMargin,
          rotations,
          onProgress: (percent, message) => setImageProgress({ percent, message }),
        });

        setResult({
          pdfBytes: res.pdfBytes,
          fileName: res.fileName,
          meta: `Compiled ${res.totalPages} page(s) into high-quality ${imagePageSize.toUpperCase()} PDF (${imageOrientation === "auto" ? "Adaptive" : imageOrientation} layout, ${imageMargin} margins)`,
          type: "pdf",
        });
        setImageProgress(null);
      } else if (isCompareMode) {
        if (!file || !compareSecondFile) throw new Error("Please select both Document 1 and Document 2 to compare.");
        const res = await comparePdf(file, compareSecondFile);
        setResult({
          compareData: res,
          textContent: res.reportText,
          fileName: `Comparison_Report_${file.name.replace(/\.[^/.]+$/, "")}_vs_${compareSecondFile.name.replace(/\.[^/.]+$/, "")}.md`,
          meta: `Comparison complete: ${res.similarityScore}% vocabulary similarity match`,
          type: "text",
        });
      } else {
        if (!file) throw new Error("Please select a document to process.");

        switch (toolId) {
          case "split-pdf":
          case "extract-pages": {
            setSplitProgress({ percent: 10, message: "Initiating split engine..." });
            let options: SplitOptions;

            if (splitMode === "extract_all") {
              options = {
                mode: "extract_all",
                onProgress: (percent, message) => setSplitProgress({ percent, message }),
              };
            } else if (splitMode === "split_every") {
              options = {
                mode: "split_every",
                splitEvery: splitEveryCount,
                onProgress: (percent, message) => setSplitProgress({ percent, message }),
              };
            } else if (splitMode === "multi_range") {
              options = {
                mode: "multi_range",
                multiRanges: splitMultiRanges,
                mergeIntoSingle: splitMergeSingle,
                onProgress: (percent, message) => setSplitProgress({ percent, message }),
              };
            } else {
              const selectedNums = splitPages.filter((p) => p.selected).map((p) => p.pageNum);
              options = {
                mode: "range",
                rangeInput: splitRange,
                selectedPages: selectedNums.length > 0 ? selectedNums : undefined,
                mergeIntoSingle: splitMergeSingle,
                onProgress: (percent, message) => setSplitProgress({ percent, message }),
              };
            }

            const res = await splitPdf(file, options);
            setResult({
              pdfBytes: res.pdfBytes,
              zipBlob: res.zipBlob,
              fileName: res.fileName,
              meta: res.summary,
              type: res.type,
            });
            setSplitProgress(null);
            break;
          }
          case "rotate-pdf": {
            setRotateProgress({ percent: 15, message: "Analyzing PDF page orientation..." });
            const res = await rotatePdf(file, {
              angleDegrees: rotateAngle,
              pageScope: rotatePageScope,
              customPages: rotateCustomPages,
              onProgress: (percent, message) => setRotateProgress({ percent, message }),
            });
            const scopeLabel =
              rotatePageScope === "all"
                ? "All pages"
                : rotatePageScope === "odd"
                ? "Odd pages"
                : rotatePageScope === "even"
                ? "Even pages"
                : `Custom pages (${rotateCustomPages})`;
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Rotated ${scopeLabel} by +${rotateAngle}° (${res.totalPages} total pages in document)`,
              type: "pdf",
            });
            setRotateProgress(null);
            break;
          }
          case "remove-pages": {
            setRemoveProgress({ percent: 15, message: "Analyzing pages for deletion..." });
            const markedNums = removePagesList.filter((p) => p.markedForRemoval).map((p) => p.pageNum);
            const inputVal = markedNums.length > 0 ? markedNums : pagesToRemove;

            const res = await removePagesFromPdf(file, {
              pagesToRemove: inputVal,
              onProgress: (percent, message) => setRemoveProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: res.summary,
              type: "pdf",
            });
            setRemoveProgress(null);
            break;
          }
          case "organize-pdf": {
            let res;
            if (organizePages.length > 0) {
              const targetItems = organizePages.map((p) => ({
                pageIndex: p.origIndex,
                rotation: p.rotation,
              }));
              res = await organizePdfPages(file, targetItems);
            } else {
              const sequenceOrMode = organizeOrder === "custom" ? customPageSequence : organizeOrder;
              res = await organizePdfPages(file, sequenceOrMode);
            }
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Organized document with ${res.pageCount} page(s) in customized visual sequence`,
              type: "pdf",
            });
            break;
          }
          case "add-watermark": {
            const res = await watermarkPdf(file, {
              type: watermarkType,
              text: watermarkText,
              imageFile: watermarkImageFile || undefined,
              layout: watermarkLayout,
              position: watermarkPosition,
              rotation: watermarkRotation,
              opacity: watermarkOpacity,
              color: watermarkColor,
              fontFamily: watermarkFont,
              fontSizeScale: watermarkFontSizeScale,
              pageScope: watermarkScope,
              customPages: watermarkCustomPages,
              onProgress: (percent, message) => setWatermarkProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: "pdf",
            });
            setWatermarkProgress(null);
            break;
          }
          case "add-page-numbers": {
            setNumberProgress({ percent: 10, message: "Parsing PDF structure..." });
            const res = await addPageNumbersToPdf(file, {
              position: numberPosition,
              format: numberFormat,
              fontFamily: numberFont,
              fontSize: numberFontSize,
              color: numberColor,
              style: numberStyle,
              facingPages: numberFacingPages,
              skipCover: numberSkipCover,
              startNumber: numberStartNumber,
              pageScope: numberScope,
              customPages: numberScope === "custom" ? numberCustomPages : undefined,
              margin: numberMargin,
              customPrefix: numberCustomPrefix.trim() || undefined,
              customSuffix: numberCustomSuffix.trim() || undefined,
              onProgress: (percent, message) => setNumberProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: "pdf",
            });
            setNumberProgress(null);
            break;
          }
          case "crop-pdf": {
            const res = await cropPdf(file, cropMargin);
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Cropped margins by ${cropMargin}pt across ${res.totalPages} pages`,
              type: "pdf",
            });
            break;
          }
          case "compress-pdf": {
            setCompressionProgress({ percent: 5, status: "Analyzing document streams..." });
            const res = await compressPdf(file, {
              level: compressionLevel,
              forceRasterize,
              onProgress: (percent, status) => {
                setCompressionProgress({ percent, status });
              },
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Optimized from ${(res.originalSize / 1024).toFixed(1)} KB to ${(res.compressedSize / 1024).toFixed(1)} KB (${res.savingsPercent}% reduction)`,
              type: "pdf",
              compressionStats: {
                originalSize: res.originalSize,
                compressedSize: res.compressedSize,
                savingsBytes: res.savingsBytes,
                savingsPercent: res.savingsPercent,
                level: res.level,
                strategyUsed: res.strategyUsed,
              },
            });
            setCompressionProgress(null);
            break;
          }
          case "repair-pdf": {
            setRepairProgress({ percent: 15, message: "Scanning binary structure..." });
            const res = await repairPdf(file, {
              strategy: repairStrategy,
              onProgress: (percent, message) => setRepairProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Recovered ${res.totalPages} page(s). Document health restored to ${res.healthScore}%.`,
              repairStats: {
                originalSize: res.originalSize,
                repairedSize: res.repairedSize,
                totalPages: res.totalPages,
                healthScore: res.healthScore,
                issuesFound: res.issuesFound,
                issuesRepaired: res.issuesRepaired,
                diagnostics: res.diagnostics,
                strategyUsed: res.strategyUsed,
              },
              type: "pdf",
            });
            setRepairProgress(null);
            break;
          }
          case "ocr-pdf": {
            setOcrProgress({ percent: 5, message: "Analyzing text layers & font structures..." });

            const visionHandler = async (pageNum: number, imageBase64: string) => {
              const aiRes = await callGeminiAi({
                task: "ocr",
                imageBase64,
                mimeType: "image/jpeg",
              });
              return aiRes.success && aiRes.text ? aiRes.text : "";
            };

            const auditRes = await auditPdfTextLayer(file, {
              mode: ocrMode,
              pageRange: ocrPageRange,
              onProgress: (percent, message) => {
                setOcrProgress({ percent, message });
              },
              geminiVisionHandler: visionHandler,
            });

            if (ocrMode === "searchable_pdf") {
              setOcrProgress({ percent: 92, message: "Injecting searchable invisible text layer into PDF..." });
              const searchableRes = await createSearchablePdf(
                file,
                auditRes.pages.map((p) => p.fullText),
                {
                  invisible: true,
                  onProgress: (percent, message) => {
                    setOcrProgress({ percent, message });
                  },
                }
              );

              setResult({
                pdfBytes: searchableRes.pdfBytes,
                fileName: searchableRes.fileName,
                meta: `Searchable PDF generated with embedded OCR text layer across ${auditRes.summary.totalPages} pages (${auditRes.summary.totalWords.toLocaleString()} words)`,
                type: "pdf",
                textContent: auditRes.markdownReport,
                ocrStats: {
                  audit: auditRes,
                  mode: ocrMode,
                  searchablePdfBytes: searchableRes.pdfBytes,
                },
              });
            } else {
              const ext = ocrMode === "vision" ? "md" : "txt";
              const reportText = ocrMode === "vision" ? auditRes.markdownReport : auditRes.fullText;
              setResult({
                textContent: reportText,
                fileName: `${file.name.replace(/\.[^/.]+$/, "")}_ocr_${ocrMode}.${ext}`,
                meta: `${auditRes.summary.documentClassification}: ${auditRes.summary.totalWords.toLocaleString()} words audited across ${auditRes.summary.totalPages} pages (${auditRes.summary.searchabilityScore}% searchability)`,
                type: "text",
                ocrStats: {
                  audit: auditRes,
                  mode: ocrMode,
                },
              });
            }

            setOcrProgress(null);
            break;
          }
          case "word-to-pdf": {
            setWordToPdfProgress({ percent: 10, message: "Parsing Word document typography & layout..." });
            const res = await convertWordToPdf(file, {
              pageSize: wordToPdfPageSize,
              margin: wordToPdfMargin,
              fontFamily: wordToPdfFont,
              includeHeader: wordToPdfIncludeHeader,
              onProgress: (percent, message) => setWordToPdfProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Converted Word document into ${res.totalPages} formatted ${wordToPdfPageSize.toUpperCase()} PDF page(s) (${wordToPdfFont} typography)`,
              type: "pdf",
            });
            setWordToPdfProgress(null);
            break;
          }
          case "excel-to-pdf": {
            setExcelProgress({ percent: 10, message: "Reading workbook sheets & computing gridlines..." });
            const res = await convertExcelToPdf(file, {
              orientation: excelOrientation,
              theme: excelTheme,
              showGridlines: excelShowGridlines,
              onProgress: (percent, message) => setExcelProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Generated ${res.totalPages} ${excelOrientation} table page(s) (${excelTheme.replace("_", " ")})`,
              type: "pdf",
            });
            setExcelProgress(null);
            break;
          }
          case "html-to-pdf": {
            setHtmlProgress({ percent: 10, message: "Parsing HTML markup & DOM structure..." });
            const res = await convertHtmlToPdf(file, {
              pageSize: htmlPageSize,
              orientation: htmlOrientation,
              margin: htmlMargin,
              onProgress: (percent, message) => setHtmlProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Rendered HTML into ${res.totalPages} formatted ${htmlPageSize.toUpperCase()} PDF page(s) (${htmlOrientation} layout)`,
              type: "pdf",
            });
            setHtmlProgress(null);
            break;
          }
          case "pdf-to-jpg": {
            setPdfToJpgProgress({ percent: 10, message: "Rasterizing PDF pages into high-resolution images..." });
            const res = await convertPdfToJpg(file, {
              scale: pdfToJpgDpi,
              format: pdfToJpgFormat,
              onProgress: (percent, message) => setPdfToJpgProgress({ percent, message }),
            });
            setResult({
              zipBlob: res.zipBlob,
              images: res.images,
              fileName: res.fileName,
              meta: `Generated ${pdfToJpgDpi === 2.0 ? "300 DPI Ultra HD" : pdfToJpgDpi === 1.5 ? "150 DPI Crisp" : "96 DPI Standard"} ${pdfToJpgFormat.toUpperCase()} images for all ${res.totalPages} pages`,
              type: "zip",
            });
            setPdfToJpgProgress(null);
            break;
          }
          case "pdf-to-word": {
            setWordProgress({ percent: 5, message: "Analyzing PDF text streams & layout..." });
            const res = await convertPdfToWord(file, {
              layoutMode: wordLayoutMode,
              styleTheme: wordStyleTheme,
              includePageNumbers: wordIncludePageNumbers,
              detectTables: wordDetectTables,
              pageRange: wordPageRange,
              onProgress: (percent, message) => setWordProgress({ percent, message }),
            });
            setResult({
              docxBlob: res.docxBlob,
              fileName: res.fileName,
              meta: `Extracted ${res.totalPages} pages into an editable Word document (${res.totalWords.toLocaleString()} words, ${res.headingsCount} headings, ${res.tablesCount} tables)`,
              type: "docx",
              wordStats: {
                result: res,
                layoutMode: wordLayoutMode,
                styleTheme: wordStyleTheme,
              },
            });
            setWordProgress(null);
            break;
          }
          case "pdf-to-excel": {
            setPdfToExcelProgress({ percent: 10, message: "Parsing PDF document & extracting text streams..." });
            const res = await convertPdfToExcel(file, {
              includePageColumn: pdfToExcelIncludePage,
              onProgress: (percent, message) => setPdfToExcelProgress({ percent, message }),
            });
            setResult({
              excelBuffer: res.excelBuffer,
              fileName: res.fileName,
              meta: `Extracted ${res.totalRows} table rows into Excel spreadsheet (.xlsx)`,
              type: "xlsx",
            });
            setPdfToExcelProgress(null);
            break;
          }
          case "pdf-to-pdfa": {
            setPdfaProgress({ percent: 15, message: "Reading PDF catalog & object tree..." });
            const res = await convertPdfToPdfA(file, {
              conformanceLevel: pdfaLevel,
              colorProfile: pdfaColorProfile,
              onProgress: (percent, message) => setPdfaProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Standardized ${res.totalPages} page(s) to ISO 19005 ${res.conformanceLevel} (${pdfaColorProfile}) archival format`,
              type: "pdf",
            });
            setPdfaProgress(null);
            break;
          }
          case "pdf-to-powerpoint": {
            setSlidesProgress({ percent: 10, message: "Rasterizing presentation slides..." });
            const res = await convertPdfToJpg(file, {
              scale: slidesDpi,
              format: slidesFormat,
              onProgress: (percent, message) => setSlidesProgress({ percent, message }),
            });
            setResult({
              zipBlob: res.zipBlob,
              images: res.images,
              fileName: `${file.name.replace(/\.[^/.]+$/, "")}_slides.zip`,
              meta: `Extracted ${res.totalPages} slides into ${slidesDpi === 2.0 ? "300 DPI Ultra HD" : slidesDpi === 1.5 ? "150 DPI Crisp" : "96 DPI"} presentation package (${slidesFormat.toUpperCase()} ZIP)`,
              type: "zip",
            });
            setSlidesProgress(null);
            break;
          }
          case "edit-pdf": {
            const res = await annotatePdf(file, {
              text: annotationText,
              subtitle: annotationSubtitle,
              position: annotationPosition,
              tone: annotationTone,
              style: annotationStyle,
              pageScope: annotationScope,
              customPages: annotationCustomPages,
              rotation: annotationRotation,
              opacity: annotationOpacity,
              includeDate: annotationIncludeDate,
              onProgress: (percent, message) => {
                setAnnotateProgress({ percent, message });
              },
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: "pdf",
            });
            setAnnotateProgress(null);
            break;
          }
          case "pdf-forms": {
            const res = await inspectAndFlattenPdfForms(file);
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Form processing complete: ${res.fieldSummary}`,
              type: "pdf",
            });
            break;
          }
          case "protect-pdf": {
            const res = await protectPdf(file, userPassword);
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Document encrypted with military-grade 256-bit AES password`,
              type: "pdf",
            });
            break;
          }
          case "unlock-pdf": {
            const res = await unlockPdf(file, unlockPassword);
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `Password restrictions removed. Document fully unlocked`,
              type: "pdf",
            });
            break;
          }
          case "sign-pdf": {
            setSignProgress({ percent: 15, message: "Preparing custom signature placements..." });

            if (signStudioConfig.placements.length === 0) {
              throw new Error("Please click or add at least one signature placement onto the PDF page.");
            }
            if (signStudioConfig.mode === "draw" && !signStudioConfig.signatureImage) {
              throw new Error("Please draw your signature in the Draw pad first, or switch to Type / Upload.");
            }
            if (signStudioConfig.mode === "upload" && !signStudioConfig.signatureImage) {
              throw new Error("Please upload your signature image first, or switch to Draw / Type.");
            }

            const res = await signPdf(file, {
              signerName: signStudioConfig.signerName,
              signerTitle: signStudioConfig.signerTitle,
              signerReason: signStudioConfig.signerReason,
              signatureImage: signStudioConfig.signatureImage,
              mode: signStudioConfig.mode,
              inkColor: signStudioConfig.inkColor,
              cursiveStyle: signStudioConfig.cursiveStyle,
              stampStyle: signStudioConfig.stampStyle,
              includeVerificationBadge: signStudioConfig.stampStyle === "badge",
              customPlacements: signStudioConfig.placements,
              onProgress: (percent, message) => setSignProgress({ percent, message }),
            });

            setSignResultData(res);
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: "pdf",
              signStats: res,
            });
            setSignProgress(null);
            break;
          }
          case "redact-pdf": {
            const res = await redactPdf(file, {
              targetMode: redactMode,
              searchTerm: redactMode === "keyword" ? redactSearchTerm : undefined,
              piiCategories: redactMode === "smart_pii" ? redactPiiCategories : undefined,
              manualBoxes: redactManualBoxes.length > 0 ? redactManualBoxes : undefined,
              fillColor: redactFillColor,
              labelStyle: redactLabelStyle,
              customLabel: redactCustomLabel || undefined,
              pageScope: redactPageScope,
              customPages: redactCustomPages,
              pageNum: redactPageNum,
              rasterize: redactRasterize,
              onProgress: (percent, message) => setRedactProgress({ percent, message }),
            });
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: res.fileName,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: "pdf",
              redactStats: res,
            });
            setRedactProgress(null);
            break;
          }
          case "ai-summarizer": {
            const { text, pages } = await extractTextFromPdf(file);
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            const tokenEst = Math.round(wordCount * 1.33);
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));

            // Call Gemini 2.5 Flash for true executive generative AI synthesis
            try {
              const aiRes = await callGeminiAi({ task: "summarize", text });
              if (aiRes.success && aiRes.text) {
                const fullReport = `${aiRes.text}\n\n---\n### 📊 Document Metadata (Gemini 2.5 Flash Analyzed)\n- **Source File**: \`${file.name}\`\n- **Document Scope**: ${pages.length} page(s)\n- **Estimated Tokens**: ~${tokenEst.toLocaleString()} tokens\n- **Estimated Reading Time**: ~${readingTime} minute(s)\n- **AI Model**: \`Google Gemini 2.5 Flash\``;

                setResult({
                  textContent: fullReport,
                  fileName: `${file.name.replace(/\.[^/.]+$/, "")}_gemini_executive_summary.md`,
                  meta: `Generated executive AI synthesis with Google Gemini 2.5 Flash (~${tokenEst.toLocaleString()} tokens)`,
                  type: "text",
                });
                break;
              }
            } catch (aiErr) {
              // Fallback to client-side extractive NLP
            }

            const res = await aiSummarizePdf(file);
            const report = `# AI Document Summary: ${file.name}\n\n${res.summary}\n\n## Key Salient Findings (NLP Ranked)\n${res.keyTakeaways.map((t, idx) => `${idx + 1}. ${t}`).join("\n\n")}\n\n## Primary Themes & Keywords\n${res.topKeywords?.map((k) => `\`${k}\``).join(" • ") || "General Content"}\n\n- **Reading Time**: ~${res.readingTimeMinutes} min\n- **Token Volume**: ~${res.tokenCount.toLocaleString()} estimated tokens\n- **Analyzed Scope**: ${res.totalPages} page(s) in browser memory`;
            setResult({
              summaryData: res,
              textContent: report,
              fileName: `${file.name.replace(/\.[^/.]+$/, "")}_ai_summary.md`,
              meta: `Analyzed ${res.totalPages} pages with NLP salience ranking (${res.tokenCount.toLocaleString()} tokens)`,
              type: "text",
            });
            break;
          }
          case "translate-pdf": {
            setTranslateProgress({ percent: 10, message: "Extracting document text & layout structure..." });
            const res = await translatePdfLayout(file, {
              targetLanguage,
              layoutMode: translateLayoutMode,
              includeBilingualPdf: translateIncludePdf,
              onProgress: (percent, message) => setTranslateProgress({ percent, message }),
            });

            setResult({
              pdfBytes: res.pdfBytes,
              textContent: res.markdownContent,
              fileName: res.pdfBytes
                ? `${file.name.replace(/\.[^/.]+$/, "")}_${targetLanguage.toLowerCase()}_bilingual.pdf`
                : `${file.name.replace(/\.[^/.]+$/, "")}_${targetLanguage.toLowerCase()}_bilingual.md`,
              meta: `${res.summary} (100% In-Browser Memory)`,
              type: res.pdfBytes ? "pdf" : "text",
              translateStats: res,
            });
            setTranslateProgress(null);
            break;
          }
          default: {
            const res = await splitPdf(file, "1-999");
            setResult({
              pdfBytes: res.pdfBytes,
              fileName: `${file.name.replace(/\.[^/.]+$/, "")}_processed.pdf`,
              meta: `Processed ${res.pageCount} page(s) successfully`,
              type: "pdf",
            });
            break;
          }
        }

        // Automatically log conversion event to Firestore
        const logFile = file || (imageItems.length > 0 ? imageItems[0].file : multiFiles[0]);
        if (user?.id && logFile) {
          logConversionRecord(user.id, {
            toolId,
            toolName: details.title,
            fileName: logFile.name,
            outputFileName: `${logFile.name.replace(/\.[^/.]+$/, "")}_processed`,
            fileSizeBytes: logFile.size,
            timestamp: Date.now(),
            status: "success",
          }).catch(() => {});
        }
      }

      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error("Tool execution error:", err);
      setError(err?.message || "Failed to process document. Please check input parameters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    let blob: Blob;

    if (result.type === "pdf" && result.pdfBytes) {
      blob = new Blob([result.pdfBytes as any], { type: "application/pdf" });
    } else if (result.type === "docx" && result.docxBlob) {
      blob = result.docxBlob;
    } else if (result.type === "xlsx" && result.excelBuffer) {
      blob = new Blob([result.excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else if (result.type === "zip" && result.zipBlob) {
      blob = result.zipBlob;
    } else if (result.textContent) {
      blob = new Blob([result.textContent], { type: "text/markdown;charset=utf-8" });
    } else {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };

  const handleCopyText = async () => {
    if (!result?.textContent) return;
    await navigator.clipboard.writeText(result.textContent);
    setHasCopiedText(true);
    setTimeout(() => setHasCopiedText(false), 2000);
  };

  const hasInput = isMultiFileMode
    ? imageItems.length > 0 || multiFiles.length > 0
    : isCompareMode
    ? !!file && !!compareSecondFile
    : !!file;

  const activeStep: 1 | 2 | 3 = result ? 3 : isProcessing ? 3 : hasInput ? 2 : 1;
  const activeProgressMessage =
    splitProgress?.message ||
    removeProgress?.message ||
    watermarkProgress?.message ||
    numberProgress?.message ||
    imageProgress?.message ||
    wordToPdfProgress?.message ||
    excelProgress?.message ||
    htmlProgress?.message ||
    pdfToJpgProgress?.message ||
    rotateProgress?.message ||
    pdfToExcelProgress?.message ||
    pdfaProgress?.message ||
    slidesProgress?.message ||
    compressionProgress?.status ||
    repairProgress?.message ||
    signProgress?.message ||
    ocrProgress?.message ||
    wordProgress?.message ||
    redactProgress?.message ||
    annotateProgress?.message ||
    translateProgress?.message ||
    (isProcessing ? "Executing client-side algorithm in memory..." : null);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Sequential Step Workflow Tracker */}
      <StepWorkflowTracker
        currentStep={activeStep}
        step1Title="Upload Document"
        step2Title="Configure Features"
        step3Title="In-RAM Conversion"
        statusMessage={activeProgressMessage}
      />
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="tool-input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: motionTokens.duration.standard }}
            className="space-y-6"
          >
            {/* Tool Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${details.color} shadow-xs`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white capitalize">{details.title}</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{details.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <ShieldCheck className="w-4 h-4" /> 100% In-Browser Privacy
              </div>
            </div>

            {/* Dropzone */}
            {!hasInput ? (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileChange(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border-2 border-dashed transition-colors cursor-pointer bg-white dark:bg-zinc-900 text-center shadow-xs ${
                    isDragging
                      ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800/50"
                      : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-zinc-500 hover:shadow-md"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      handleFileChange(e.target.files);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    accept={details.accepts}
                    multiple={isMultiFileMode}
                    className="hidden"
                  />

                  <IconComponent className="h-8 w-8 text-zinc-900 dark:text-zinc-100 mb-3 stroke-[1.75]" />

                  <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-1.5">
                    {isMultiFileMode ? "Select Images or Slides" : isCompareMode ? "Select Document 1 to Compare" : "Select Document to Process"}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                    Accepts {details.accepts.replace(/\*/g, "all")} • Drag & drop or click to browse
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <span className="inline-flex items-center justify-center px-5 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-colors pointer-events-none">
                      Choose Document
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSample();
                      }}
                      className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-700"
                    >
                      ⚡ Load Sample Document
                    </button>
                  </div>
                </div>

                {isCompareMode && file && !compareSecondFile && (
                  <div
                    onClick={() => compareInputRef.current?.click()}
                    className="p-8 rounded-2xl border-2 border-dashed border-sky-400 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/30 text-center cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors space-y-2"
                  >
                    <input
                      type="file"
                      ref={compareInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setCompareSecondFile(e.target.files[0]);
                        if (compareInputRef.current) compareInputRef.current.value = "";
                      }}
                      accept=".pdf"
                      className="hidden"
                    />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Document 1 Loaded: {file.name}</span>
                    </div>
                    <GitCompare className="w-8 h-8 text-sky-600 dark:text-sky-400 mx-auto" />
                    <p className="text-sm font-bold text-sky-950 dark:text-white">Select Document 2 for Comparison</p>
                    <p className="text-xs text-sky-700 dark:text-sky-300">Click to browse or drop second PDF here</p>
                  </div>
                )}
              </div>
            ) : (
              /* Configuration and Action Panel */
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-950 dark:text-white truncate max-w-sm sm:max-w-md">
                        {isMultiFileMode
                          ? `${(imageItems.length || multiFiles.length)} item${(imageItems.length || multiFiles.length) === 1 ? "" : "s"} selected`
                          : isCompareMode
                          ? `${file?.name} vs ${compareSecondFile?.name}`
                          : file?.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {isMultiFileMode
                          ? `Total: ${((imageItems.length > 0 ? imageItems.reduce((acc, it) => acc + it.file.size, 0) : multiFiles.reduce((acc, f) => acc + f.size, 0)) / 1024).toFixed(1)} KB`
                          : file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={resetState}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                {/* Hidden File Input for Adding More Images */}
                <input
                  type="file"
                  ref={addImageInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const filesArr = Array.from(e.target.files);
                      const newItems: ImageStudioItem[] = filesArr.map((f, i) => ({
                        id: `img-${Date.now()}-${i}-${Math.random()}`,
                        file: f,
                        previewUrl: URL.createObjectURL(f),
                        rotation: 0,
                      }));
                      setImageItems((prev) => [...prev, ...newItems]);
                      setMultiFiles((prev) => [...prev, ...filesArr]);
                      if (addImageInputRef.current) addImageInputRef.current.value = "";
                    }
                  }}
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                />

                {/* Tool Custom Parameters */}
                {isMultiFileMode && (
                  <div className="space-y-5 text-left">
                    {/* Studio Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          {toolId === "scan-to-pdf" ? (
                            <Camera className="w-4 h-4 text-rose-500" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-amber-500" />
                          )}
                          {toolId === "scan-to-pdf" ? "Scanned Documents & Page Order" : "Images to PDF Studio"}
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {imageItems.length} page{imageItems.length === 1 ? "" : "s"} queued • Rotate sideways scans &amp; arrange reading order
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addImageInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add More {toolId === "scan-to-pdf" ? "Scans" : "Images"}
                        </button>
                        {imageItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              imageItems.forEach((it) => {
                                try { URL.revokeObjectURL(it.previewUrl); } catch {}
                              });
                              setImageItems([]);
                              setMultiFiles([]);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {imageItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="group relative flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden shadow-xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
                        >
                          {/* Card Top Pill: Page # and Delete */}
                          <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteImageItem(item.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Remove this page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Thumbnail Preview with Dynamic CSS Rotation */}
                          <div className="relative aspect-[3/4] w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={`Page ${idx + 1}`}
                                style={{
                                  transform: `rotate(${item.rotation}deg)`,
                                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                }}
                                className="max-h-full max-w-full object-contain pointer-events-none"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            )}

                            {item.rotation !== 0 && (
                              <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950/80 text-white backdrop-blur-xs">
                                {item.rotation}°
                              </span>
                            )}
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px]">
                            <button
                              type="button"
                              onClick={() => rotateImageItem(item.id)}
                              className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 py-0.5 px-1 rounded cursor-pointer"
                              title="Rotate 90° clockwise"
                            >
                              <RotateCw className="w-3 h-3" /> +90°
                            </button>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveImageItem(idx, idx - 1)}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Move earlier"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === imageItems.length - 1}
                                onClick={() => moveImageItem(idx, idx + 1)}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Move later"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Layout & Margin Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      {/* Page Standard Size */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Paper Standard
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "a4", label: "A4 Sheet" },
                            { id: "fit", label: "Fit Photo" },
                            { id: "letter", label: "US Letter" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setImagePageSize(s.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                imagePageSize === s.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Page Orientation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Page Orientation
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "auto", label: "Auto" },
                            { id: "portrait", label: "Portrait" },
                            { id: "landscape", label: "Landscape" },
                          ].map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setImageOrientation(o.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                imageOrientation === o.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Page Margin */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Page Margins
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "none", label: "Full Bleed" },
                            { id: "small", label: "Small" },
                            { id: "large", label: "Spacious" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setImageMargin(m.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                imageMargin === m.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(toolId === "split-pdf" || toolId === "extract-pages") && (
                  <div className="space-y-4 text-left">
                    {/* Split Method Segmented Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        Splitting Mode &amp; Strategy
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        {[
                          { id: "range", label: "Select Pages", desc: "Pick specific pages" },
                          { id: "extract_all", label: "Extract All", desc: "All pages into ZIP" },
                          { id: "split_every", label: "Fixed Batches", desc: "Split every N pages" },
                          { id: "multi_range", label: "Custom Ranges", desc: "Multiple sections" },
                        ].map((m) => {
                          const isActive = splitMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSplitMode(m.id as any)}
                              className={`px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200/90 dark:border-zinc-700"
                                  : "hover:bg-zinc-200/50 dark:hover:bg-zinc-900 border border-transparent"
                              }`}
                            >
                              <div className={`text-xs font-bold ${isActive ? "text-zinc-950 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {m.label}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {m.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MODE 1: VISUAL RANGE SELECT */}
                    {splitMode === "range" && (
                      <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                        {/* Toolbar with counts and presets */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              Interactive Page Selection
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold tnum">
                              {splitPages.filter((p) => p.selected).length} of {splitPages.length} selected
                            </span>
                            {isLoadingSplitThumbnails && (
                              <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Rendering previews...
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => selectAllSplitPages(true)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => selectEvenSplitPages()}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Even
                            </button>
                            <button
                              type="button"
                              onClick={() => selectOddSplitPages()}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Odd
                            </button>
                            <button
                              type="button"
                              onClick={() => invertSplitPages()}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Invert
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAllSplitPages(false)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* Page Thumbnail Gallery */}
                        {splitPages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[340px] overflow-y-auto p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            {splitPages.map((page) => (
                              <div
                                key={page.pageNum}
                                onClick={() => toggleSplitPage(page.pageNum)}
                                className={`relative flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer select-none ${
                                  page.selected
                                    ? "ring-2 ring-zinc-950 dark:ring-white border-transparent bg-zinc-100/70 dark:bg-zinc-800/60 shadow-xs"
                                    : "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-400"
                                }`}
                              >
                                {/* Checkbox indicator */}
                                <div className="absolute top-1.5 right-1.5 z-10">
                                  <div
                                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                                      page.selected
                                        ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                                        : "border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                                    }`}
                                  >
                                    {page.selected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </div>

                                {/* Page Preview */}
                                <div className="w-full aspect-[3/4] bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-200/60 dark:border-zinc-800/60">
                                  {page.thumbnailUrl ? (
                                    <img
                                      src={page.thumbnailUrl}
                                      alt={`Page ${page.pageNum}`}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-zinc-400">
                                      <FileText className="w-6 h-6 stroke-1" />
                                      <span className="text-[11px] font-mono tnum">#{page.pageNum}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Page Number Caption */}
                                <span className="mt-1.5 text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tnum">
                                  Page {page.pageNum}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                            {isLoadingSplitThumbnails ? "Loading document pages..." : "Click or enter pages to extract below"}
                          </div>
                        )}

                        {/* Range Text Input & Output Mode Toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Page Range Expression
                            </label>
                            <input
                              type="text"
                              value={splitRange}
                              onChange={(e) => handleSplitRangeTextChange(e.target.value)}
                              placeholder="e.g. 1-2, 4"
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white text-xs font-mono focus:outline-none focus:border-zinc-950 dark:focus:border-white"
                            />
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                              Synced with page cards (e.g. 1-3, 5, 7-9).
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Output Delivery Mode
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSplitMergeSingle(true)}
                                className={`px-2.5 py-2 rounded-xl text-left border transition-colors cursor-pointer ${
                                  splitMergeSingle
                                    ? "border-zinc-950 dark:border-white bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-2xs"
                                    : "border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs"
                                }`}
                              >
                                <div className="text-xs">Single PDF</div>
                                <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">Merge pages</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSplitMergeSingle(false)}
                                className={`px-2.5 py-2 rounded-xl text-left border transition-colors cursor-pointer ${
                                  !splitMergeSingle
                                    ? "border-zinc-950 dark:border-white bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-2xs"
                                    : "border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs"
                                }`}
                              >
                                <div className="text-xs">ZIP Archive</div>
                                <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">Individual files</div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODE 2: EXTRACT ALL PAGES */}
                    {splitMode === "extract_all" && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                            <Archive className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                              Extract Every Single Page into Standalone PDFs
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              Every page in your document will be separated into its own independent PDF file (e.g. <span className="font-mono text-zinc-800 dark:text-zinc-200">page_01.pdf</span>, <span className="font-mono text-zinc-800 dark:text-zinc-200">page_02.pdf</span>...) and packed into a single compressed ZIP archive.
                            </p>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-zinc-600 dark:text-zinc-400">Total Output Files:</span>
                          <span className="font-mono font-bold text-zinc-950 dark:text-white tnum">
                            {splitPages.length > 0 ? `${splitPages.length} Standalone PDF Files (.ZIP)` : "All Pages (.ZIP)"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* MODE 3: SPLIT EVERY N PAGES */}
                    {splitMode === "split_every" && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Pages Per Split Document
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, splitPages.length || 100)}
                              value={splitEveryCount}
                              onChange={(e) => setSplitEveryCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-mono text-xs font-bold focus:outline-none"
                            />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">page(s) per file</span>
                          </div>
                        </div>

                        {/* Quick Batch Presets */}
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 5, 10].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setSplitEveryCount(count)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                splitEveryCount === count
                                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-2xs"
                                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                              }`}
                            >
                              Every {count} {count === 1 ? "page" : "pages"}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-zinc-600 dark:text-zinc-400">Projected Result:</span>
                          <span className="font-mono font-bold text-zinc-950 dark:text-white tnum">
                            {splitPages.length > 0 ? `${Math.ceil(splitPages.length / splitEveryCount)} Document(s) in ZIP Archive` : "Batch ZIP Archive"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* MODE 4: CUSTOM MULTI-RANGES */}
                    {splitMode === "multi_range" && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                            Custom Split Sections
                          </span>
                          <button
                            type="button"
                            onClick={addMultiRangeRow}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Section
                          </button>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {splitMultiRanges.map((range, rIdx) => (
                            <div
                              key={range.id}
                              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                            >
                              <input
                                type="text"
                                value={range.name}
                                onChange={(e) => updateMultiRangeRow(range.id, { name: e.target.value })}
                                placeholder={`Part ${rIdx + 1}`}
                                className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-medium text-xs focus:outline-none"
                              />
                              <span className="text-zinc-500 font-medium">Pages</span>
                              <input
                                type="number"
                                min={1}
                                max={splitPages.length || 999}
                                value={range.from}
                                onChange={(e) => updateMultiRangeRow(range.id, { from: parseInt(e.target.value) || 1 })}
                                className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-center text-xs font-bold focus:outline-none"
                              />
                              <span className="text-zinc-500 font-medium">to</span>
                              <input
                                type="number"
                                min={range.from}
                                max={splitPages.length || 999}
                                value={range.to}
                                onChange={(e) => updateMultiRangeRow(range.id, { to: parseInt(e.target.value) || range.from })}
                                className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-center text-xs font-bold focus:outline-none"
                              />
                              {splitMultiRanges.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMultiRangeRow(range.id)}
                                  className="ml-auto p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                  title="Remove section"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {toolId === "rotate-pdf" && (
                  <div className="space-y-4 text-left">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Orientation &amp; Page Scope
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Zero Quality Loss
                      </span>
                    </div>

                    {/* Rotation Angle Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Rotation Angle
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { deg: 90, label: "+90° Clockwise", desc: "Turn right (quarter)" },
                          { deg: 180, label: "+180° Invert", desc: "Turn upside down" },
                          { deg: 270, label: "+270° Counter-CW", desc: "Turn left (three-quarters)" },
                        ].map((item) => (
                          <button
                            key={item.deg}
                            type="button"
                            onClick={() => setRotateAngle(item.deg)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              rotateAngle === item.deg
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                rotateAngle === item.deg
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {item.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Page Scope Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Target Pages
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { scope: "all" as const, label: "All Pages", tag: "Full PDF" },
                          { scope: "odd" as const, label: "Odd Pages", tag: "1, 3, 5..." },
                          { scope: "even" as const, label: "Even Pages", tag: "2, 4, 6..." },
                          { scope: "custom" as const, label: "Custom Range", tag: "Specific" },
                        ].map((item) => (
                          <button
                            key={item.scope}
                            type="button"
                            onClick={() => setRotatePageScope(item.scope)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              rotatePageScope === item.scope
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div
                              className={`text-[10px] font-mono ${
                                rotatePageScope === item.scope
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {item.tag}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Page Input */}
                    {rotatePageScope === "custom" && (
                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                          <span>Enter Page Numbers or Ranges</span>
                          <span className="text-[10px] text-zinc-500 font-mono">e.g. 1, 3, 5-8</span>
                        </label>
                        <input
                          type="text"
                          value={rotateCustomPages}
                          onChange={(e) => setRotateCustomPages(e.target.value)}
                          placeholder="1, 3, 5-8"
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {toolId === "remove-pages" && (
                  <div className="space-y-4 text-left">
                    {/* Header Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          Visual Page Remover
                        </span>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold tnum ${
                            removePagesList.length > 0 &&
                            removePagesList.filter((p) => p.markedForRemoval).length >= removePagesList.length
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                              : removePagesList.filter((p) => p.markedForRemoval).length > 0
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {removePagesList.filter((p) => p.markedForRemoval).length} of {removePagesList.length || 0} marked for deletion
                        </span>
                        {isLoadingRemoveThumbnails && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Rendering previews...
                          </span>
                        )}
                      </div>

                      {/* Quick Selection Presets */}
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={markEvenPagesForRemoval}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          title="Mark all even pages (2, 4, 6...) for deletion"
                        >
                          Even Pages
                        </button>
                        <button
                          type="button"
                          onClick={markOddPagesForRemoval}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          title="Mark all odd pages (1, 3, 5...) for deletion"
                        >
                          Odd Pages
                        </button>
                        <button
                          type="button"
                          onClick={markFirstPageForRemoval}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          title="Mark first page for deletion"
                        >
                          First Page
                        </button>
                        <button
                          type="button"
                          onClick={markLastPageForRemoval}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          title="Mark last page for deletion"
                        >
                          Last Page
                        </button>
                        <button
                          type="button"
                          onClick={clearRemoveSelection}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                          title="Keep all pages (clear deletion marks)"
                        >
                          Keep All
                        </button>
                      </div>
                    </div>

                    {/* Safeguard Warning if all pages marked */}
                    {removePagesList.length > 0 &&
                      removePagesList.filter((p) => p.markedForRemoval).length >= removePagesList.length && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>
                            <strong>Cannot delete all pages:</strong> A PDF document must contain at least 1 page. Please uncheck at least one page to keep.
                          </span>
                        </div>
                      )}

                    {/* Interactive Page Thumbnails Grid */}
                    {removePagesList.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[380px] overflow-y-auto p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
                        {removePagesList.map((page) => (
                          <div
                            key={page.pageNum}
                            onClick={() => toggleRemovePage(page.pageNum)}
                            className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer select-none ${
                              page.markedForRemoval
                                ? "border-rose-400 dark:border-rose-600/80 bg-rose-50/70 dark:bg-rose-950/50 shadow-inner"
                                : "border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs"
                            }`}
                          >
                            {/* Card Top: Page Number & Delete Action */}
                            <div className="w-full flex items-center justify-between gap-1 mb-1.5">
                              <span
                                className={`text-[11px] font-mono font-bold tnum ${
                                  page.markedForRemoval
                                    ? "text-rose-700 dark:text-rose-400 line-through"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                Page {page.pageNum}
                              </span>

                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                  page.markedForRemoval
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-zinc-400 hover:text-rose-600 group-hover:bg-rose-50 dark:group-hover:bg-rose-950/50"
                                }`}
                                title={page.markedForRemoval ? "Click to keep page" : "Click to delete page"}
                              >
                                <Trash2 className="w-3 h-3 stroke-[2.2]" />
                              </div>
                            </div>

                            {/* Page Preview Thumbnail */}
                            <div className="relative w-full aspect-[3/4] bg-white dark:bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-200/60 dark:border-zinc-800/60">
                              {page.thumbnailUrl ? (
                                <img
                                  src={page.thumbnailUrl}
                                  alt={`Page ${page.pageNum}`}
                                  className={`w-full h-full object-contain transition-opacity ${
                                    page.markedForRemoval ? "opacity-35 grayscale" : "opacity-100"
                                  }`}
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-zinc-400">
                                  <FileText className="w-6 h-6 stroke-1" />
                                  <span className="text-[11px] font-mono tnum">#{page.pageNum}</span>
                                </div>
                              )}

                              {/* Deleted Overlay Banner */}
                              {page.markedForRemoval && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/20 backdrop-blur-[0.5px]">
                                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                                    To Delete
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Card Caption */}
                            <span
                              className={`mt-1.5 text-[11px] font-semibold transition-colors ${
                                page.markedForRemoval
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                              }`}
                            >
                              {page.markedForRemoval ? "Will be deleted" : "Keep page"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
                        {isLoadingRemoveThumbnails ? (
                          <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Preparing page thumbnails...
                          </span>
                        ) : (
                          "Select a document to inspect and delete pages visually."
                        )}
                      </div>
                    )}

                    {/* Manual Range Input Synced with Gallery */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Pages to Delete Expression
                        </label>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Synced with cards above
                        </span>
                      </div>
                      <input
                        type="text"
                        value={pagesToRemove}
                        onChange={(e) => handleRemoveTextChange(e.target.value)}
                        placeholder="e.g. 2, 4-6"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white text-xs font-mono focus:border-zinc-950 dark:focus:border-white focus:outline-none"
                      />
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                        Supports comma-separated page numbers and ranges (e.g. 2, 4-6, 8). Click any page card above to toggle.
                      </span>
                    </div>
                  </div>
                )}

                {toolId === "add-watermark" && (
                  <div className="space-y-4 text-left">
                    {/* Header Presets Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Stamp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Security Watermark Presets
                        </label>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          One-click quick templates
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {WATERMARK_PRESETS.map((preset) => {
                          const isActive = watermarkActivePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setWatermarkActivePreset(preset.id);
                                setWatermarkType("text");
                                setWatermarkText(preset.text);
                                setWatermarkColor(preset.color);
                                setWatermarkRotation(preset.rotation);
                                setWatermarkLayout(preset.layout);
                                setWatermarkOpacity(preset.opacity);
                              }}
                              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                                isActive
                                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/80 shadow-xs ring-1 ring-purple-500/30"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-900 dark:text-white line-clamp-1">
                                  {preset.name}
                                </span>
                                {isActive && <Check className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />}
                              </div>
                              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 font-mono">
                                {preset.text}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Visualizer + Controls 2-Column Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                      {/* Left: Interactive Live Page Placement Preview */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-between p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-full flex items-center justify-between text-xs pb-2.5 mb-2 border-b border-zinc-200/70 dark:border-zinc-800">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            Live Watermark Placement
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                            {watermarkScope === "all" ? "All Pages" : watermarkScope === "first" ? "Cover Page" : watermarkScope === "exclude_first" ? "Pages 2+" : watermarkScope === "even" ? "Even Pages" : watermarkScope === "odd" ? "Odd Pages" : `Pages ${watermarkCustomPages}`}
                          </span>
                        </div>

                        {/* Simulated A4 Paper Canvas */}
                        <div className="relative w-full max-w-[240px] aspect-[1/1.414] bg-white rounded-xl shadow-md border border-zinc-300/80 overflow-hidden select-none my-1 flex flex-col justify-between p-3.5">
                          {/* Background document thumbnail or simulated lines */}
                          {watermarkThumbnail ? (
                            <img
                              src={watermarkThumbnail}
                              alt="Document Page 1"
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
                            />
                          ) : (
                            <div className="absolute inset-0 p-3 flex flex-col gap-1.5 pointer-events-none opacity-30">
                              <div className="h-2 w-2/3 bg-zinc-400 rounded-xs mb-2" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-4/5 bg-zinc-300 rounded-xs mb-2" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-11/12 bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-3/4 bg-zinc-300 rounded-xs" />
                            </div>
                          )}

                          {/* Dynamic Overlaid Watermark Rendering */}
                          {watermarkLayout === "tiled_repeat" ? (
                            /* Tiled Grid */
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2 pointer-events-none z-10 gap-2 items-center justify-items-center">
                              {Array.from({ length: 9 }).map((_, i) => (
                                <div
                                  key={i}
                                  style={{
                                    transform: `rotate(${watermarkRotation}deg)`,
                                    opacity: Math.min(watermarkOpacity * 0.9, 0.45),
                                  }}
                                  className={`text-center font-black text-[11px] uppercase tracking-wider select-none ${
                                    watermarkColor === "red"
                                      ? "text-red-700"
                                      : watermarkColor === "blue"
                                      ? "text-blue-700"
                                      : watermarkColor === "green"
                                      ? "text-emerald-700"
                                      : watermarkColor === "amber"
                                      ? "text-amber-700"
                                      : watermarkColor === "black"
                                      ? "text-black"
                                      : "text-zinc-600"
                                  }`}
                                >
                                  {watermarkType === "image" && watermarkImagePreview ? (
                                    <img src={watermarkImagePreview} alt="" className="w-8 h-8 object-contain mx-auto" />
                                  ) : (
                                    watermarkText || "CONFIDENTIAL"
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : watermarkLayout === "custom_position" ? (
                            /* Custom Position */
                            <div
                              className={`absolute z-10 transition-all duration-150 pointer-events-none ${
                                watermarkPosition === "top-left"
                                  ? "top-3 left-3"
                                  : watermarkPosition === "top-center"
                                  ? "top-3 left-1/2 -translate-x-1/2"
                                  : watermarkPosition === "top-right"
                                  ? "top-3 right-3"
                                  : watermarkPosition === "middle-left"
                                  ? "top-1/2 -translate-y-1/2 left-3"
                                  : watermarkPosition === "center"
                                  ? "top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
                                  : watermarkPosition === "middle-right"
                                  ? "top-1/2 -translate-y-1/2 right-3"
                                  : watermarkPosition === "bottom-left"
                                  ? "bottom-3 left-3"
                                  : watermarkPosition === "bottom-center"
                                  ? "bottom-3 left-1/2 -translate-x-1/2"
                                  : "bottom-3 right-3"
                              }`}
                              style={{
                                transform: `rotate(${watermarkRotation}deg)`,
                                opacity: watermarkOpacity,
                              }}
                            >
                              {watermarkType === "image" && watermarkImagePreview ? (
                                <img src={watermarkImagePreview} alt="" className="w-16 h-16 object-contain" />
                              ) : (
                                <span
                                  className={`font-black uppercase tracking-wider select-none whitespace-nowrap ${
                                    watermarkFontSizeScale === "small"
                                      ? "text-[11px]"
                                      : watermarkFontSizeScale === "large"
                                      ? "text-base"
                                      : "text-xs"
                                  } ${
                                    watermarkColor === "red"
                                      ? "text-red-700"
                                      : watermarkColor === "blue"
                                      ? "text-blue-700"
                                      : watermarkColor === "green"
                                      ? "text-emerald-700"
                                      : watermarkColor === "amber"
                                      ? "text-amber-700"
                                      : watermarkColor === "black"
                                      ? "text-black"
                                      : "text-zinc-600"
                                  }`}
                                >
                                  {watermarkText || "CONFIDENTIAL"}
                                </span>
                              )}
                            </div>
                          ) : (
                            /* Default: Large Centered Diagonal */
                            <div
                              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                              style={{
                                transform: `rotate(${watermarkRotation}deg)`,
                                opacity: watermarkOpacity,
                              }}
                            >
                              {watermarkType === "image" && watermarkImagePreview ? (
                                <img src={watermarkImagePreview} alt="" className="w-24 h-24 object-contain" />
                              ) : (
                                <span
                                  className={`font-black uppercase tracking-wider select-none text-center whitespace-nowrap ${
                                    watermarkFontSizeScale === "small"
                                      ? "text-xs"
                                      : watermarkFontSizeScale === "large"
                                      ? "text-2xl"
                                      : "text-base sm:text-lg"
                                  } ${
                                    watermarkColor === "red"
                                      ? "text-red-700"
                                      : watermarkColor === "blue"
                                      ? "text-blue-700"
                                      : watermarkColor === "green"
                                      ? "text-emerald-700"
                                      : watermarkColor === "amber"
                                      ? "text-amber-700"
                                      : watermarkColor === "black"
                                      ? "text-black"
                                      : "text-zinc-600"
                                  }`}
                                >
                                  {watermarkText || "CONFIDENTIAL"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Watermark metadata readout */}
                        <div className="w-full text-center mt-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                            Layout: {watermarkLayout.replace("_", " ")} • Angle: {watermarkRotation}° • Opacity: {Math.round(watermarkOpacity * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Right: Detailed Configuration Panel */}
                      <div className="lg:col-span-7 space-y-3.5">
                        {/* Type Switcher: Text vs Image */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Watermark Medium
                            </label>
                            <span className="text-[11px] text-zinc-500">Choose text or logo</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setWatermarkType("text")}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                watermarkType === "text"
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                              }`}
                            >
                              <Type className="w-4 h-4" />
                              <span>Text Watermark</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setWatermarkType("image")}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                watermarkType === "image"
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                              }`}
                            >
                              <ImageIcon className="w-4 h-4" />
                              <span>Image / Logo Watermark</span>
                            </button>
                          </div>
                        </div>

                        {/* Content Input: Text or Image */}
                        {watermarkType === "text" ? (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Watermark Text
                              </label>
                              <input
                                type="text"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="CONFIDENTIAL"
                                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-bold focus:border-zinc-950 dark:focus:border-zinc-500 focus:outline-none"
                              />
                            </div>
                            {/* Quick words */}
                            <div className="flex flex-wrap gap-1">
                              {["CONFIDENTIAL", "DO NOT COPY", "DRAFT", "SAMPLE", "RESTRICTED"].map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => setWatermarkText(w)}
                                  className="text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium cursor-pointer"
                                >
                                  {w}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Image Upload Box */
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Upload Watermark Logo (PNG / JPG / WebP)
                            </label>
                            {watermarkImagePreview ? (
                              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                <div className="flex items-center gap-3">
                                  <img src={watermarkImagePreview} alt="" className="w-10 h-10 object-contain rounded-md border p-1" />
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[180px]">
                                      {watermarkImageFile?.name || "Watermark Logo"}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                      {watermarkImageFile ? `${(watermarkImageFile.size / 1024).toFixed(1)} KB` : "Embedded logo"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWatermarkImageFile(null);
                                    setWatermarkImagePreview(null);
                                  }}
                                  className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remove image"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors">
                                <ImageIcon className="w-6 h-6 text-zinc-400 mb-1" />
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  Click or drop image logo
                                </span>
                                <span className="text-[11px] text-zinc-500">Supports PNG transparent logos</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const img = e.target.files?.[0];
                                    if (img) {
                                      setWatermarkImageFile(img);
                                      const url = URL.createObjectURL(img);
                                      setWatermarkImagePreview(url);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {/* Layout Strategy */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Watermark Layout
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: "single_center", label: "Diagonal Center" },
                              { id: "tiled_repeat", label: "Tiled Repeat" },
                              { id: "custom_position", label: "9-Grid Placement" },
                            ].map((lay) => (
                              <button
                                key={lay.id}
                                type="button"
                                onClick={() => setWatermarkLayout(lay.id as any)}
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                                  watermarkLayout === lay.id
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                }`}
                              >
                                {lay.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Conditional 3x3 Grid Placement (if custom_position) */}
                        {watermarkLayout === "custom_position" && (
                          <div className="space-y-1 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Select Placement Position
                            </label>
                            <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto pt-1">
                              {[
                                { pos: "top-left", label: "TL" },
                                { pos: "top-center", label: "TC" },
                                { pos: "top-right", label: "TR" },
                                { pos: "middle-left", label: "ML" },
                                { pos: "center", label: "C" },
                                { pos: "middle-right", label: "MR" },
                                { pos: "bottom-left", label: "BL" },
                                { pos: "bottom-center", label: "BC" },
                                { pos: "bottom-right", label: "BR" },
                              ].map((item) => (
                                <button
                                  key={item.pos}
                                  type="button"
                                  onClick={() => setWatermarkPosition(item.pos as any)}
                                  className={`h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    watermarkPosition === item.pos
                                      ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-600"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color & Font (when text mode) */}
                        {watermarkType === "text" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Color Palette */}
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Watermark Color
                              </label>
                              <div className="grid grid-cols-3 gap-1">
                                {[
                                  { id: "gray", label: "Slate", dot: "bg-zinc-500" },
                                  { id: "red", label: "Crimson", dot: "bg-red-500" },
                                  { id: "blue", label: "Navy", dot: "bg-blue-500" },
                                  { id: "green", label: "Forest", dot: "bg-emerald-500" },
                                  { id: "amber", label: "Amber", dot: "bg-amber-500" },
                                  { id: "black", label: "Black", dot: "bg-black dark:bg-white" },
                                ].map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setWatermarkColor(c.id as any)}
                                    className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      watermarkColor === c.id
                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                                    <span>{c.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Font Family */}
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Font Typography
                              </label>
                              <div className="grid grid-cols-3 gap-1">
                                {[
                                  { id: "helvetica", label: "Sans Bold" },
                                  { id: "times", label: "Serif" },
                                  { id: "courier", label: "Mono" },
                                ].map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setWatermarkFont(f.id as any)}
                                    className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                                      watermarkFont === f.id
                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Page Scope & Rotation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Scope */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Target Pages
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              {[
                                { id: "all", label: "All Pages" },
                                { id: "first", label: "Cover Only" },
                                { id: "exclude_first", label: "Pages 2+" },
                                { id: "custom", label: "Custom Range" },
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setWatermarkScope(s.id as any)}
                                  className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                    watermarkScope === s.id
                                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                            {watermarkScope === "custom" && (
                              <input
                                type="text"
                                value={watermarkCustomPages}
                                onChange={(e) => setWatermarkCustomPages(e.target.value)}
                                placeholder="e.g. 1-3, 5"
                                className="w-full mt-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono"
                              />
                            )}
                          </div>

                          {/* Angle Presets */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">Rotation Angle</span>
                              <span className="font-mono text-[11px] text-zinc-500">{watermarkRotation}°</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { deg: 45, label: "45°" },
                                { deg: 30, label: "30°" },
                                { deg: 0, label: "0°" },
                                { deg: -45, label: "-45°" },
                              ].map((item) => (
                                <button
                                  key={item.deg}
                                  type="button"
                                  onClick={() => setWatermarkRotation(item.deg)}
                                  className={`py-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                    watermarkRotation === item.deg
                                      ? "bg-purple-600 text-white shadow-xs"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Opacity Slider */}
                        <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">Watermark Opacity</span>
                            <span className="font-mono text-[11px] text-zinc-500">{Math.round(watermarkOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.80"
                            step="0.05"
                            value={watermarkOpacity}
                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "add-page-numbers" && (
                  <div className="space-y-4">
                    {/* Presets Header Bar */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Page Numbering Presets
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          6 Built-In Layouts
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {PAGE_NUMBER_PRESETS.map((preset) => {
                          const isActive = numberActivePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setNumberActivePreset(preset.id);
                                setNumberFormat(preset.format);
                                setNumberPosition(preset.position);
                                setNumberStyle(preset.style);
                                setNumberFacingPages(Boolean(preset.facingPages));
                                setNumberSkipCover(Boolean(preset.skipCover));
                              }}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isActive
                                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              }`}
                            >
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {preset.name}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-mono mt-1">
                                {preset.position.replace("-", " ")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2-Column Studio: Left Preview Canvas, Right Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left: Interactive A4 Page Visualizer Canvas */}
                      <div className="lg:col-span-5 flex flex-col items-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> A4 Live Canvas
                          </span>
                          {/* Page Switcher (Page 1 vs Page 2 for Facing Pages / Skip Cover check) */}
                          <div className="flex items-center gap-1 bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setNumberPreviewPage(1)}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                numberPreviewPage === 1
                                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              Page 1 (Odd)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNumberPreviewPage(2)}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                numberPreviewPage === 2
                                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              Page 2 (Even)
                            </button>
                          </div>
                        </div>

                        {/* A4 Sheet Container */}
                        {(() => {
                          // Compute preview position with facing pages logic
                          let effectivePos = numberPosition;
                          if (numberFacingPages && numberPreviewPage === 2) {
                            if (effectivePos === "bottom-right") effectivePos = "bottom-left";
                            else if (effectivePos === "bottom-left") effectivePos = "bottom-right";
                            else if (effectivePos === "top-right") effectivePos = "top-left";
                            else if (effectivePos === "top-left") effectivePos = "top-right";
                          }

                          const isTop = effectivePos.startsWith("top");
                          const isBottom = effectivePos.startsWith("bottom");
                          const isLeft = effectivePos.endsWith("left");
                          const isCenter = effectivePos.endsWith("center");
                          const isRight = effectivePos.endsWith("right");

                          // Compute text preview
                          const isCoverSkipped = numberSkipCover && numberPreviewPage === 1;
                          const effectiveNum = numberPreviewPage - (numberSkipCover ? 1 : 0) + (numberStartNumber - 1);
                          const totalDemoPages = numberSkipCover ? 7 : 8;

                          let displayText = `Page ${effectiveNum} of ${totalDemoPages}`;
                          if (numberFormat === "number_slash_total") {
                            displayText = `${effectiveNum} / ${totalDemoPages}`;
                          } else if (numberFormat === "number_only") {
                            displayText = `${effectiveNum}`;
                          } else if (numberFormat === "hyphen_number") {
                            displayText = `- ${effectiveNum} -`;
                          } else if (numberFormat === "roman_lower") {
                            const romLower = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
                            displayText = romLower[effectiveNum - 1] || `${effectiveNum}`;
                          } else if (numberFormat === "roman_upper") {
                            const romUpper = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
                            displayText = romUpper[effectiveNum - 1] || `${effectiveNum}`;
                          } else if (numberFormat === "custom") {
                            displayText = `${numberCustomPrefix}${effectiveNum}${numberCustomSuffix}`;
                          }

                          const currentThumb = numberPreviewPage === 1 ? numberThumbnail1 : numberThumbnail2;

                          return (
                            <div className="relative w-full max-w-[270px] aspect-[1/1.414] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-md overflow-hidden flex flex-col justify-between p-3 select-none">
                              {/* Background page thumbnail or document mockup wireframe */}
                              {currentThumb ? (
                                <img
                                  src={currentThumb}
                                  alt={`Page ${numberPreviewPage}`}
                                  className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-85"
                                />
                              ) : (
                                <div className="absolute inset-0 p-4 space-y-2 pointer-events-none opacity-25 dark:opacity-20 flex flex-col justify-between">
                                  <div className="space-y-1.5">
                                    <div className="h-3 w-1/3 bg-zinc-400 dark:bg-zinc-600 rounded" />
                                    <div className="h-1.5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                    <div className="h-1.5 w-5/6 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                    <div className="h-1.5 w-4/6 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="h-1.5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                    <div className="h-1.5 w-11/12 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                    <div className="h-1.5 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="h-1.5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                    <div className="h-1.5 w-4/5 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                  </div>
                                </div>
                              )}

                              {/* Overlaid Page Number Indicator */}
                              {isCoverSkipped ? (
                                <div className="absolute inset-x-3 bottom-3 py-1.5 px-2 rounded-lg border border-dashed border-zinc-400 dark:border-zinc-600 bg-white/90 dark:bg-zinc-950/90 text-center z-10">
                                  <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                                    Page 1 Cover Blank (Skip Cover active)
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className={`absolute z-10 transition-all duration-200 ${
                                    isTop ? "top-2.5" : "bottom-2.5"
                                  } ${
                                    isLeft
                                      ? "left-3 text-left"
                                      : isRight
                                      ? "right-3 text-right"
                                      : "left-0 right-0 text-center"
                                  } ${
                                    numberStyle === "accent_line"
                                      ? isTop
                                        ? "border-b border-zinc-300 dark:border-zinc-700 pb-1 w-[calc(100%-24px)] mx-3"
                                        : "border-t border-zinc-300 dark:border-zinc-700 pt-1 w-[calc(100%-24px)] mx-3"
                                      : ""
                                  }`}
                                >
                                  <span
                                    className={`inline-block transition-all ${
                                      numberFont === "helvetica"
                                        ? "font-sans"
                                        : numberFont === "times"
                                        ? "font-serif"
                                        : "font-mono"
                                    } ${
                                      numberFontSize <= 9
                                        ? "text-[11px]"
                                        : numberFontSize <= 11
                                        ? "text-xs"
                                        : "text-sm"
                                    } ${
                                      numberColor === "dark"
                                        ? "text-zinc-900 dark:text-zinc-100"
                                        : numberColor === "gray"
                                        ? "text-zinc-500 dark:text-zinc-400"
                                        : numberColor === "blue"
                                        ? "text-blue-600 dark:text-blue-400"
                                        : numberColor === "crimson"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    } ${
                                      numberStyle === "pill_badge"
                                        ? "px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 shadow-xs font-semibold"
                                        : "font-medium"
                                    }`}
                                  >
                                    {displayText}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Readout Summary */}
                        <div className="w-full text-center pt-2 border-t border-zinc-200/70 dark:border-zinc-800 space-y-0.5">
                          <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold truncate">
                            {numberFormat.replace(/_/g, " ")} • {numberPosition.replace("-", " ")}
                            {numberFacingPages ? " (Facing Mirrored)" : ""}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            Margin: {numberMargin}pt • Style: {numberStyle.replace("_", " ")} • Font: {numberFont}
                          </p>
                        </div>
                      </div>

                      {/* Right: Detailed Configuration Panel */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* Numbering Format Cards */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Numbering Format
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: "page_of_total", label: "Page 1 of 8", desc: "Formal" },
                              { id: "number_slash_total", label: "1 / 8", desc: "Modern" },
                              { id: "number_only", label: "1", desc: "Minimal" },
                              { id: "hyphen_number", label: "- 1 -", desc: "Classic" },
                              { id: "roman_lower", label: "i, ii, iii", desc: "Preface" },
                              { id: "roman_upper", label: "I, II, III", desc: "Legal" },
                              { id: "custom", label: "Custom...", desc: "Prefix/Suffix" },
                            ].map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setNumberFormat(f.id as any);
                                  setNumberActivePreset("");
                                }}
                                className={`py-1.5 px-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  numberFormat === f.id
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                }`}
                              >
                                <span className="block text-xs font-bold truncate">{f.label}</span>
                                <span className={`text-[11px] block truncate ${numberFormat === f.id ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}>
                                  {f.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Custom Format Inputs */}
                          {numberFormat === "custom" && (
                            <div className="grid grid-cols-2 gap-2 pt-1.5">
                              <div>
                                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                                  Prefix Text
                                </label>
                                <input
                                  type="text"
                                  value={numberCustomPrefix}
                                  onChange={(e) => setNumberCustomPrefix(e.target.value)}
                                  placeholder="DocDrop • Page "
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-purple-600"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                                  Suffix Text
                                </label>
                                <input
                                  type="text"
                                  value={numberCustomSuffix}
                                  onChange={(e) => setNumberCustomSuffix(e.target.value)}
                                  placeholder=" • Confidential"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-purple-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Position Anchor Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Placement Position (6 Anchors)
                            </label>
                            <span className="text-[11px] font-mono text-zinc-500">
                              Selected: {numberPosition.replace("-", " ")}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { pos: "top-left" as const, label: "Top Left", icon: AlignLeft },
                              { pos: "top-center" as const, label: "Top Center", icon: AlignCenter },
                              { pos: "top-right" as const, label: "Top Right", icon: AlignRight },
                              { pos: "bottom-left" as const, label: "Bottom Left", icon: AlignLeft },
                              { pos: "bottom-center" as const, label: "Bottom Center", icon: AlignCenter },
                              { pos: "bottom-right" as const, label: "Bottom Right", icon: AlignRight },
                            ].map((p) => {
                              const Icon = p.icon;
                              const isSelected = numberPosition === p.pos;
                              return (
                                <button
                                  key={p.pos}
                                  type="button"
                                  onClick={() => {
                                    setNumberPosition(p.pos);
                                    setNumberActivePreset("");
                                  }}
                                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  <span>{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Book Binding & Cover Handling */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Facing Pages Mirroring */}
                          <label className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-2.5 cursor-pointer hover:border-zinc-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={numberFacingPages}
                              onChange={(e) => {
                                setNumberFacingPages(e.target.checked);
                                setNumberActivePreset("");
                              }}
                              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                                Facing Pages (Mirror)
                              </span>
                              <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">
                                Mirrors alignment on odd/even pages for book binding.
                              </span>
                            </div>
                          </label>

                          {/* Skip Cover Page */}
                          <label className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-2.5 cursor-pointer hover:border-zinc-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={numberSkipCover}
                              onChange={(e) => {
                                setNumberSkipCover(e.target.checked);
                                setNumberActivePreset("");
                              }}
                              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                                Skip Cover Page
                              </span>
                              <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">
                                Keeps Page 1 unnumbered; numbering starts on page 2.
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Typography & Palette */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Font Family */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Font Typography
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: "helvetica", label: "Sans" },
                                { id: "times", label: "Serif" },
                                { id: "courier", label: "Mono" },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setNumberFont(f.id as any)}
                                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                                    numberFont === f.id
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Font Size ({numberFontSize}pt)
                            </label>
                            <div className="grid grid-cols-5 gap-1">
                              {[8, 9, 10, 11, 12].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setNumberFontSize(s)}
                                  className={`py-1 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                                    numberFontSize === s
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  {s}pt
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Color & Style */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Color Palette */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Number Color
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: "dark", label: "Dark", dot: "bg-zinc-900 dark:bg-zinc-200" },
                                { id: "gray", label: "Muted", dot: "bg-zinc-400" },
                                { id: "blue", label: "Navy", dot: "bg-blue-600" },
                                { id: "crimson", label: "Crimson", dot: "bg-rose-600" },
                                { id: "amber", label: "Amber", dot: "bg-amber-600" },
                              ].map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setNumberColor(c.id as any)}
                                  className={`py-1 px-1 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                    numberColor === c.id
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                                  <span>{c.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Decorative Style */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Decorative Treatment
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: "plain", label: "Plain Text" },
                                { id: "pill_badge", label: "Pill Capsule" },
                                { id: "accent_line", label: "Accent Rule" },
                              ].map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    setNumberStyle(st.id as any);
                                    setNumberActivePreset("");
                                  }}
                                  className={`py-1 px-1 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                                    numberStyle === st.id
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Starting Page Number & Margins */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Starting Count */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Start Count Number
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={numberStartNumber}
                              onChange={(e) => setNumberStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          {/* Margin Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">Page Edge Margin</span>
                              <span className="font-mono text-[11px] text-zinc-500">{numberMargin} pt</span>
                            </div>
                            <input
                              type="range"
                              min="14"
                              max="54"
                              step="2"
                              value={numberMargin}
                              onChange={(e) => setNumberMargin(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600 mt-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "compress-pdf" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        Compression Level & Strategy
                      </label>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Zero Uploads • 100% In-Browser
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: "extreme" as const,
                          title: "Extreme",
                          badge: "~70–85% OFF",
                          badgeClass: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
                          desc: "Maximum reduction for scans, images, email attachments & portal size limits.",
                          res: "72–96 DPI JPEG",
                        },
                        {
                          id: "recommended" as const,
                          title: "Recommended",
                          badge: "Popular",
                          badgeClass: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
                          desc: "Optimal balance of crisp visual clarity and smaller file size for sharing.",
                          res: "110 DPI Adaptive",
                        },
                        {
                          id: "light" as const,
                          title: "Light / Lossless",
                          badge: "Pristine",
                          badgeClass: "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
                          desc: "100% vector text preserved. Strips metadata bloat and repacks streams.",
                          res: "Vector Sharp",
                        },
                      ].map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => setCompressionLevel(preset.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            compressionLevel === preset.id
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold">{preset.title}</span>
                              <span
                                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  compressionLevel === preset.id
                                    ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950"
                                    : preset.badgeClass
                                }`}
                              >
                                {preset.badge}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed mb-3 ${
                                compressionLevel === preset.id
                                  ? "text-zinc-300 dark:text-zinc-700"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {preset.desc}
                            </p>
                          </div>
                          <div
                            className={`text-[11px] font-mono pt-2 border-t flex items-center justify-between ${
                              compressionLevel === preset.id
                                ? "border-white/10 dark:border-zinc-950/10 text-zinc-300 dark:text-zinc-700"
                                : "border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            <span>Target Engine:</span>
                            <span className="font-semibold">{preset.res}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Deep Resampling Toggle for Extreme Savings */}
                    <div
                      onClick={() => setForceRasterize(!forceRasterize)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        forceRasterize
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                          : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={forceRasterize}
                          onChange={(e) => setForceRasterize(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-950 dark:accent-white cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold">
                            Deep Multi-Page Downsampling
                          </p>
                          <p
                            className={`text-[11px] ${
                              forceRasterize
                                ? "text-zinc-300 dark:text-zinc-700"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            Re-encodes all slides, embedded charts & FlateDecode images for maximum file reduction.
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                          forceRasterize
                            ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {forceRasterize ? "ACTIVE" : "OPTIONAL"}
                      </span>
                    </div>
                  </div>
                )}

                {toolId === "repair-pdf" && (
                  <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Recovery Engine Mode
                        </label>
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Memory
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          {
                            id: "smart",
                            name: "Smart Auto-Repair",
                            badge: "Recommended",
                            desc: "Heals truncated EOF, strips garbage preambles, and reconstructs damaged XREF tables.",
                          },
                          {
                            id: "structural",
                            name: "Structural Rebuild",
                            badge: "Deep Clean",
                            desc: "Re-indexes object dictionary trees, resolves indirect references, and purges dead streams.",
                          },
                          {
                            id: "stream_rebuild",
                            name: "Fault-Tolerant Salvage",
                            badge: "High Resilience",
                            desc: "Uses resilient stream parser to salvage readable pages from heavily corrupted PDFs.",
                          },
                        ].map((m) => {
                          const isActive = repairStrategy === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setRepairStrategy(m.id as any)}
                              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isActive
                                  ? "border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                                  : "border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:border-zinc-400 dark:hover:border-zinc-600"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold leading-tight">{m.name}</span>
                                  <span
                                    className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      isActive
                                        ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    {m.badge}
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] leading-relaxed ${
                                    isActive
                                      ? "text-zinc-300 dark:text-zinc-600"
                                      : "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {m.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pre-flight Diagnostic Checkpoints */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Automated Recovery Checkpoints
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">4-Stage Pipeline</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 block">01 Header</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">Binary Scan</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 block">02 Catalog</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">XREF Rebuild</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 block">03 Streams</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">De-corrupt</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500 block">04 Pages</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">100% Salvage</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "crop-pdf" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Border Margin Inset: {cropMargin}pt (~{(cropMargin / 72).toFixed(2)} in)
                    </label>
                    <input
                      type="range"
                      min="18"
                      max="72"
                      step="6"
                      value={cropMargin}
                      onChange={(e) => setCropMargin(parseInt(e.target.value, 10))}
                      className="w-full mt-2"
                    />
                  </div>
                )}

                {toolId === "protect-pdf" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Set Document Password (AES-256)
                    </label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter secure password"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-sm font-mono focus:border-zinc-950 dark:focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                )}

                {toolId === "unlock-pdf" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Enter Current Password (if known)
                    </label>
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-sm font-mono focus:border-zinc-950 dark:focus:border-zinc-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Sample locked document uses password: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">123456</code>
                    </p>
                  </div>
                )}

                {toolId === "sign-pdf" && (
                  <SignPdfStudio
                    file={file}
                    value={signStudioConfig}
                    onChange={setSignStudioConfig}
                  />
                )}

                {toolId === "redact-pdf" && (
                  <div className="space-y-4">
                    {/* Header Presets Bar */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <EyeOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Redaction & PII Scrubbing Presets
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          6 Pre-Configured Templates
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {REDACT_PRESETS.map((preset) => {
                          const isActive = redactActivePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setRedactActivePreset(preset.id);
                                setRedactMode(preset.targetMode);
                                if (preset.searchTerm) setRedactSearchTerm(preset.searchTerm);
                                if (preset.piiCategories) setRedactPiiCategories(preset.piiCategories);
                                setRedactFillColor(preset.fillColor);
                                setRedactLabelStyle(preset.labelStyle);
                                if (preset.customLabel) setRedactCustomLabel(preset.customLabel);
                              }}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isActive
                                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              }`}
                            >
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {preset.name}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-mono mt-1 truncate">
                                {preset.targetMode === "smart_pii" ? "PII Pattern" : preset.searchTerm || "Preset"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2-Column Redaction Studio Workspace */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left: Interactive Canvas & Page Navigator (5 cols) */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                              Interactive Page Canvas
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              Page {redactPageNum} of {redactTotalPages}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={redactPageNum <= 1 || isLoadingRedactThumb}
                              onClick={() => {
                                if (file && redactPageNum > 1) {
                                  loadRedactThumbnail(file, redactPageNum - 1);
                                }
                              }}
                              className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              title="Previous page"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={redactPageNum >= redactTotalPages || isLoadingRedactThumb}
                              onClick={() => {
                                if (file && redactPageNum < redactTotalPages) {
                                  loadRedactThumbnail(file, redactPageNum + 1);
                                }
                              }}
                              className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              title="Next page"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Page Canvas with Draw-to-Redact Overlay */}
                        <div
                          ref={redactCanvasRef}
                          onPointerDown={handleRedactPointerDown}
                          onPointerMove={handleRedactPointerMove}
                          onPointerUp={handleRedactPointerUp}
                          className="relative aspect-[1/1.414] rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden shadow-inner flex items-center justify-center select-none cursor-crosshair touch-none"
                        >
                          {isLoadingRedactThumb ? (
                            <div className="flex flex-col items-center gap-2 text-zinc-500">
                              <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                              <span className="text-xs font-medium">Rendering page {redactPageNum}...</span>
                            </div>
                          ) : redactThumbnailUrl ? (
                            <img
                              src={redactThumbnailUrl}
                              alt={`Page ${redactPageNum} Preview`}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                Click or drag on this canvas to blackout areas
                              </p>
                            </div>
                          )}

                          {/* Existing manual boxes on current page */}
                          {redactManualBoxes
                            .filter((b) => b.pageNum === redactPageNum)
                            .map((box, bIdx) => {
                              // Convert PDF coordinates (595.28 x 841.89) to percentage
                              const leftPct = (box.x / 595.28) * 100;
                              const topPct = (1 - (box.y + box.height) / 841.89) * 100;
                              const widthPct = (box.width / 595.28) * 100;
                              const heightPct = (box.height / 841.89) * 100;

                              return (
                                <div
                                  key={bIdx}
                                  style={{
                                    left: `${Math.max(0, leftPct)}%`,
                                    top: `${Math.max(0, topPct)}%`,
                                    width: `${Math.min(100, widthPct)}%`,
                                    height: `${Math.min(100, heightPct)}%`,
                                    backgroundColor:
                                      redactFillColor === "white"
                                        ? "#ffffff"
                                        : redactFillColor === "dark_slate"
                                        ? "#1e293b"
                                        : redactFillColor === "red"
                                        ? "#7f1d1d"
                                        : "#000000",
                                  }}
                                  className="absolute border border-rose-500/80 shadow-xs flex items-center justify-center overflow-hidden pointer-events-none"
                                >
                                  <span className="text-[11px] font-bold text-white px-1 truncate font-mono">
                                    {redactLabelStyle === "none"
                                      ? ""
                                      : redactLabelStyle === "custom"
                                      ? redactCustomLabel || "[REDACTED]"
                                      : `[${redactLabelStyle.toUpperCase()}]`}
                                  </span>
                                </div>
                              );
                            })}

                          {/* Live dragging box preview */}
                          {isDrawingRedactBox && redactDragStart && redactCurrentDrag && (
                            <div
                              style={{
                                left: `${Math.min(redactDragStart.x, redactCurrentDrag.x)}%`,
                                top: `${Math.min(redactDragStart.y, redactCurrentDrag.y)}%`,
                                width: `${Math.abs(redactCurrentDrag.x - redactDragStart.x)}%`,
                                height: `${Math.abs(redactCurrentDrag.y - redactDragStart.y)}%`,
                              }}
                              className="absolute bg-rose-600/40 border-2 border-rose-600 border-dashed pointer-events-none"
                            />
                          )}
                        </div>

                        {/* Canvas Controls Toolbar */}
                        <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1 font-mono">
                            <Scissors className="w-3.5 h-3.5 text-rose-500" />
                            {redactManualBoxes.filter((b) => b.pageNum === redactPageNum).length} manual box(es) on P{redactPageNum}
                          </span>
                          {redactManualBoxes.filter((b) => b.pageNum === redactPageNum).length > 0 && (
                            <button
                              type="button"
                              onClick={clearCurrentPageBoxes}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Clear Page Boxes
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Redaction Parameters & Controls (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* 1. Targeting Mode */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                            Targeting Mode
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "smart_pii", label: "Smart PII Scan", desc: "Auto-detect SSN, emails, phones" },
                              { id: "keyword", label: "Keyword / Search", desc: "Match exact phrase across pages" },
                              { id: "manual_box", label: "Manual Box Only", desc: "Drag boxes on live preview" },
                            ].map((m) => {
                              const isActive = redactMode === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setRedactMode(m.id as any)}
                                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                                  }`}
                                >
                                  <span className="text-xs font-bold block">{m.label}</span>
                                  <span className={`text-[11px] block mt-0.5 truncate ${isActive ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}>
                                    {m.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. PII Pattern Selection (if in smart_pii mode) */}
                        {redactMode === "smart_pii" && (
                          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                              PII Categories to Purge
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { key: "ssn", label: "Social Security (SSN)" },
                                { key: "email", label: "Email Addresses" },
                                { key: "phone", label: "Phone Numbers" },
                                { key: "creditCard", label: "Credit Cards" },
                                { key: "financial", label: "Financial / Currency" },
                                { key: "ipAddress", label: "IPv4 Addresses" },
                              ].map(({ key, label }) => {
                                const isChecked = Boolean(redactPiiCategories[key as keyof PiiCategories]);
                                return (
                                  <label
                                    key={key}
                                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200"
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) =>
                                        setRedactPiiCategories((prev) => ({ ...prev, [key]: e.target.checked }))
                                      }
                                      className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <span className="truncate">{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Keyword / Phrase Input (if in keyword mode) */}
                        {redactMode === "keyword" && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center justify-between">
                              <span>Sensitive Term or Target Phrase</span>
                              <span className="text-[11px] text-zinc-500 font-normal">Case-insensitive matching</span>
                            </label>
                            <input
                              type="text"
                              value={redactSearchTerm}
                              onChange={(e) => setRedactSearchTerm(e.target.value)}
                              placeholder="e.g. Confidential, Secret, ACME Corp, John Doe"
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-bold focus:border-rose-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* 4. Redaction Color & Appearance */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Fill Color */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                              Fill Style
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { id: "black", name: "Solid Black", hex: "bg-black" },
                                { id: "white", name: "Whiteout", hex: "bg-white border border-zinc-300" },
                                { id: "dark_slate", name: "Slate", hex: "bg-slate-800" },
                                { id: "red", name: "Crimson", hex: "bg-rose-900" },
                              ].map((c) => {
                                const isActive = redactFillColor === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setRedactFillColor(c.id as any)}
                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                      isActive
                                        ? "border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-500"
                                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded-full ${c.hex}`} />
                                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                                      {c.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Overlay Label */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                              Overlay Badge Label
                            </label>
                            <select
                              value={redactLabelStyle}
                              onChange={(e) => setRedactLabelStyle(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none"
                            >
                              <option value="pii_masked">[PII MASKED]</option>
                              <option value="redacted">[REDACTED]</option>
                              <option value="confidential">[CONFIDENTIAL]</option>
                              <option value="privileged">[LEGAL PRIVILEGE]</option>
                              <option value="foia_b6">[FOIA EXEMPT (b)(6)]</option>
                              <option value="foia_b4">[FOIA EXEMPT (b)(4)]</option>
                              <option value="hipaa_phi">[HIPAA PHI]</option>
                              <option value="none">Solid Mask (No Label)</option>
                              <option value="custom">Custom Text...</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom label input if custom chosen */}
                        {redactLabelStyle === "custom" && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Custom Label Text</label>
                            <input
                              type="text"
                              value={redactCustomLabel}
                              onChange={(e) => setRedactCustomLabel(e.target.value)}
                              placeholder="e.g. CLASSIFIED, RESTRICTED"
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-bold focus:outline-none"
                            />
                          </div>
                        )}

                        {/* 5. Page Scope */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                            Document Scope
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "all", label: "All Pages", desc: "Scrub entire document" },
                              { id: "current", label: `Page ${redactPageNum}`, desc: "Active preview page only" },
                              { id: "custom", label: "Custom Range", desc: "Specific page subset" },
                            ].map((s) => {
                              const isActive = redactPageScope === s.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setRedactPageScope(s.id as any)}
                                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-400 text-rose-900 dark:text-rose-100"
                                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                                  }`}
                                >
                                  <span className="text-xs font-bold block">{s.label}</span>
                                  <span className="text-[11px] text-zinc-500 block mt-0.5">{s.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                          {redactPageScope === "custom" && (
                            <input
                              type="text"
                              value={redactCustomPages}
                              onChange={(e) => setRedactCustomPages(e.target.value)}
                              placeholder="e.g. 1-3, 5"
                              className="w-full mt-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-mono focus:outline-none"
                            />
                          )}
                        </div>

                        {/* 6. Zero-Leak Deep Rasterization Shield */}
                        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={redactRasterize}
                              onChange={(e) => setRedactRasterize(e.target.checked)}
                              className="mt-0.5 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white block flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Zero-Leak Deep Canvas Rasterization
                              </span>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Physically flattens affected pages into high-resolution bitmaps to permanently obliterate underlying vector text, font programs, and invisible layers. Text highlighting or OCR scraping is physically impossible.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "organize-pdf" && (
                  <div className="space-y-4">
                    {/* Header Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          Page Manager
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold tnum">
                          {organizePages.length} {organizePages.length === 1 ? "page" : "pages"}
                        </span>
                        {isLoadingThumbnails && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Rendering previews...
                          </span>
                        )}
                      </div>

                      {/* Quick Action Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOrganizePages((prev) => [...prev].reverse())}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                          title="Reverse page sequence"
                        >
                          <Undo2 className="w-3 h-3" /> Reverse
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOrganizePages((prev) =>
                              prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                          title="Rotate all pages clockwise by 90 degrees"
                        >
                          <RotateCw className="w-3 h-3" /> Rotate All +90°
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (file) loadOrganizeThumbnails(file);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Reset to original PDF page sequence"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Interactive Page Thumbnails Grid */}
                    {organizePages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[460px] overflow-y-auto p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
                        {organizePages.map((page, idx) => (
                          <div
                            key={page.id}
                            draggable
                            onDragStart={() => setDraggedPageIndex(idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggedPageIndex !== null && draggedPageIndex !== idx) {
                                moveOrganizePage(draggedPageIndex, idx);
                              }
                              setDraggedPageIndex(null);
                            }}
                            className={`group relative flex flex-col justify-between p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-900 ${
                              draggedPageIndex === idx
                                ? "opacity-40 border-dashed border-zinc-950 dark:border-white"
                                : "border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs"
                            }`}
                          >
                            {/* Card Top: Position & Badges */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="flex items-center gap-1 text-[11px] font-bold font-mono text-zinc-950 dark:text-white tnum">
                                <GripVertical className="w-3 h-3 text-zinc-400 opacity-60 group-hover:opacity-100" />
                                Page {idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                {page.rotation !== 0 && (
                                  <span className="text-[11px] font-mono font-bold px-1 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                                    +{page.rotation}°
                                  </span>
                                )}
                                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                                  #{page.origIndex + 1}
                                </span>
                              </div>
                            </div>

                            {/* Thumbnail Preview with CSS Rotation */}
                            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center relative p-1">
                              {page.thumbnailUrl ? (
                                <img
                                  src={page.thumbnailUrl}
                                  alt={`Page ${idx + 1}`}
                                  className="w-full h-full object-contain transition-transform duration-200"
                                  style={{ transform: `rotate(${page.rotation}deg)` }}
                                />
                              ) : (
                                <div className="text-center space-y-1">
                                  <FileText className="w-6 h-6 text-zinc-400 mx-auto" />
                                  <span className="text-[11px] font-mono text-zinc-500">Page {page.origIndex + 1}</span>
                                </div>
                              )}
                            </div>

                            {/* Card Action Controls */}
                            <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveOrganizePage(idx, idx - 1);
                                  }}
                                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Left"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === organizePages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveOrganizePage(idx, idx + 1);
                                  }}
                                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Right"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rotateOrganizePage(idx);
                                  }}
                                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                                  title="Rotate Page +90°"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateOrganizePage(idx);
                                  }}
                                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                                  title="Duplicate Page"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={organizePages.length <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOrganizePage(idx);
                                  }}
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  title="Delete Page"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
                        {isLoadingThumbnails ? (
                          <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Preparing page thumbnails...
                          </span>
                        ) : (
                          "Select a document to inspect and organize pages visually."
                        )}
                      </div>
                    )}
                  </div>
                )}

                {toolId === "edit-pdf" && (
                  <div className="space-y-4 text-left">
                    {/* Header Presets Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Stamp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Certified Stamp Presets
                        </label>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          One-click official presets
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {ANNOTATE_PRESETS.map((preset) => {
                          const isActive = annotationActivePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setAnnotationActivePreset(preset.id);
                                setAnnotationText(preset.text);
                                setAnnotationSubtitle(preset.subtitle);
                                setAnnotationTone(preset.tone);
                                setAnnotationStyle(preset.style);
                                setAnnotationRotation(preset.rotation);
                              }}
                              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                                isActive
                                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/80 shadow-xs ring-1 ring-purple-500/30"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-900 dark:text-white line-clamp-1">
                                  {preset.name}
                                </span>
                                {isActive && <Check className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />}
                              </div>
                              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                                {preset.text}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Visualizer + Controls 2-Column Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                      {/* Left: Interactive Live Page Placement Preview */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-between p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-full flex items-center justify-between text-xs pb-2.5 mb-2 border-b border-zinc-200/70 dark:border-zinc-800">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            Live Stamp Placement
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                            {annotationScope === "all" ? "All Pages" : annotationScope === "first" ? "Page 1" : annotationScope === "last" ? "End Page" : `Pages ${annotationCustomPages}`}
                          </span>
                        </div>

                        {/* Simulated A4 Paper Canvas */}
                        <div className="relative w-full max-w-[240px] aspect-[1/1.414] bg-white rounded-xl shadow-md border border-zinc-300/80 overflow-hidden select-none my-1 flex flex-col justify-between p-3.5">
                          {/* Background document thumbnail or simulated lines */}
                          {annotatePreviewThumbnail ? (
                            <img
                              src={annotatePreviewThumbnail}
                              alt="Document Page 1"
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
                            />
                          ) : (
                            <div className="absolute inset-0 p-3 flex flex-col gap-1.5 pointer-events-none opacity-30">
                              <div className="h-2 w-2/3 bg-zinc-400 rounded-xs mb-2" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-4/5 bg-zinc-300 rounded-xs mb-2" />
                              <div className="h-1.5 w-full bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-11/12 bg-zinc-300 rounded-xs" />
                              <div className="h-1.5 w-3/4 bg-zinc-300 rounded-xs" />
                            </div>
                          )}

                          {/* Dynamic Overlaid Stamp Badge */}
                          <div
                            className={`absolute z-10 transition-all duration-150 ${
                              annotationPosition === "top-left"
                                ? "top-2.5 left-2.5"
                                : annotationPosition === "top-center"
                                ? "top-2.5 left-1/2 -translate-x-1/2"
                                : annotationPosition === "top-right"
                                ? "top-2.5 right-2.5"
                                : annotationPosition === "middle-left"
                                ? "top-1/2 -translate-y-1/2 left-2.5"
                                : annotationPosition === "center"
                                ? "top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
                                : annotationPosition === "middle-right"
                                ? "top-1/2 -translate-y-1/2 right-2.5"
                                : annotationPosition === "bottom-left"
                                ? "bottom-2.5 left-2.5"
                                : annotationPosition === "bottom-center"
                                ? "bottom-2.5 left-1/2 -translate-x-1/2"
                                : "bottom-2.5 right-2.5"
                            }`}
                            style={{
                              transform: `rotate(${annotationRotation}deg)`,
                              opacity: annotationOpacity,
                            }}
                          >
                            {/* Visual Render according to style & tone */}
                            {annotationStyle === "rubber_stamp" ? (
                              <div
                                className={`border-[1.75px] rounded-md p-0.5 shadow-xs ${
                                  annotationTone === "approved"
                                    ? "border-emerald-600 bg-emerald-50/90 text-emerald-800"
                                    : annotationTone === "rejected"
                                    ? "border-red-600 bg-red-50/90 text-red-800"
                                    : annotationTone === "note"
                                    ? "border-blue-600 bg-blue-50/90 text-blue-800"
                                    : annotationTone === "warning"
                                    ? "border-amber-600 bg-amber-50/90 text-amber-800"
                                    : annotationTone === "review"
                                    ? "border-purple-600 bg-purple-50/90 text-purple-800"
                                    : "border-zinc-700 bg-zinc-100/90 text-zinc-800"
                                }`}
                              >
                                <div className="border border-current px-2 py-0.5 text-center">
                                  <div className="text-[11px] font-black uppercase tracking-wider leading-none">
                                    {annotationText || "APPROVED"}
                                  </div>
                                  {(annotationSubtitle || annotationIncludeDate) && (
                                    <div className="text-[11px] font-bold uppercase tracking-tight mt-0.5 opacity-80 leading-none">
                                      {annotationSubtitle || (annotationIncludeDate ? `DOCDROP • ${new Date().toISOString().slice(0, 10)}` : "")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : annotationStyle === "callout_box" ? (
                              <div
                                className={`border-l-4 border rounded-md p-1.5 shadow-xs text-left ${
                                  annotationTone === "approved"
                                    ? "border-l-emerald-600 border-zinc-200 bg-emerald-50/90 text-emerald-800"
                                    : annotationTone === "rejected"
                                    ? "border-l-red-600 border-zinc-200 bg-red-50/90 text-red-800"
                                    : annotationTone === "note"
                                    ? "border-l-blue-600 border-zinc-200 bg-blue-50/90 text-blue-800"
                                    : annotationTone === "warning"
                                    ? "border-l-amber-600 border-zinc-200 bg-amber-50/90 text-amber-800"
                                    : annotationTone === "review"
                                    ? "border-l-purple-600 border-zinc-200 bg-purple-50/90 text-purple-800"
                                    : "border-l-zinc-700 border-zinc-200 bg-zinc-100/90 text-zinc-800"
                                }`}
                              >
                                <div className="text-[11px] font-bold uppercase leading-tight">
                                  {annotationText || "AUDIT NOTE"}
                                </div>
                                {(annotationSubtitle || annotationIncludeDate) && (
                                  <div className="text-[11px] text-zinc-600 mt-0.5 leading-tight">
                                    {annotationSubtitle || (annotationIncludeDate ? `Logged on ${new Date().toISOString().slice(0, 10)}` : "")}
                                  </div>
                                )}
                              </div>
                            ) : annotationStyle === "banner_diagonal" ? (
                              <div
                                className={`px-2.5 py-0.5 rounded-xs text-center text-white shadow-xs ${
                                  annotationTone === "approved"
                                    ? "bg-emerald-600"
                                    : annotationTone === "rejected"
                                    ? "bg-red-600"
                                    : annotationTone === "note"
                                    ? "bg-blue-600"
                                    : annotationTone === "warning"
                                    ? "bg-amber-600"
                                    : annotationTone === "review"
                                    ? "bg-purple-600"
                                    : "bg-zinc-800"
                                }`}
                              >
                                <div className="text-[11px] font-black uppercase tracking-wider leading-none">
                                  {annotationText || "CONFIDENTIAL"}
                                </div>
                              </div>
                            ) : (
                              /* Modern Badge Pill */
                              <div
                                className={`rounded-full border-[1.5px] px-2.5 py-1 text-center shadow-xs ${
                                  annotationTone === "approved"
                                    ? "border-emerald-600 bg-emerald-50/95 text-emerald-800"
                                    : annotationTone === "rejected"
                                    ? "border-red-600 bg-red-50/95 text-red-800"
                                    : annotationTone === "note"
                                    ? "border-blue-600 bg-blue-50/95 text-blue-800"
                                    : annotationTone === "warning"
                                    ? "border-amber-600 bg-amber-50/95 text-amber-800"
                                    : annotationTone === "review"
                                    ? "border-purple-600 bg-purple-50/95 text-purple-800"
                                    : "border-zinc-700 bg-zinc-100/95 text-zinc-800"
                                }`}
                              >
                                <div className="text-[11px] font-bold uppercase leading-none">
                                  {annotationText || "APPROVED"}
                                </div>
                                {(annotationSubtitle || annotationIncludeDate) && (
                                  <div className="text-[11px] font-medium opacity-80 mt-0.5 leading-none">
                                    {annotationSubtitle || (annotationIncludeDate ? `DOCDROP • ${new Date().toISOString().slice(0, 10)}` : "")}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stamp metadata readout */}
                        <div className="w-full text-center mt-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                            Position: {annotationPosition} • Angle: {annotationRotation}° • Opacity: {Math.round(annotationOpacity * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Right: Detailed Configuration Panel */}
                      <div className="lg:col-span-7 space-y-3.5">
                        {/* Stamp Text & Subtitle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Primary Stamp Text
                            </label>
                            <input
                              type="text"
                              value={annotationText}
                              onChange={(e) => setAnnotationText(e.target.value)}
                              placeholder="APPROVED FOR PRODUCTION"
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-bold focus:border-zinc-950 dark:focus:border-zinc-500 focus:outline-none"
                            />
                            {/* Quick words */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {["APPROVED", "CONFIDENTIAL", "FINAL DRAFT", "URGENT"].map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => setAnnotationText(w)}
                                  className="text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium cursor-pointer"
                                >
                                  {w}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Subtitle / Notice
                              </label>
                              <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={annotationIncludeDate}
                                  onChange={(e) => setAnnotationIncludeDate(e.target.checked)}
                                  className="w-3 h-3 rounded-xs text-purple-600"
                                />
                                <span>Add Date</span>
                              </label>
                            </div>
                            <input
                              type="text"
                              value={annotationSubtitle}
                              onChange={(e) => setAnnotationSubtitle(e.target.value)}
                              placeholder="DOCDROP AUDIT COMPLIANT"
                              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white text-xs font-medium focus:border-zinc-950 dark:focus:border-zinc-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Stamp Style & Color Tone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Style */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Stamp Visual Style
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: "rubber_stamp", label: "Rubber Stamp" },
                                { id: "badge", label: "Pill Badge" },
                                { id: "callout_box", label: "Audit Callout" },
                                { id: "banner_diagonal", label: "Corner Banner" },
                              ].map((style) => (
                                <button
                                  key={style.id}
                                  type="button"
                                  onClick={() => setAnnotationStyle(style.id as any)}
                                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                                    annotationStyle === style.id
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  {style.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tone Palette */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Status Color Palette
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: "approved", label: "Approved", dot: "bg-emerald-500" },
                                { id: "rejected", label: "Rejected", dot: "bg-red-500" },
                                { id: "note", label: "Official", dot: "bg-blue-500" },
                                { id: "confidential", label: "Private", dot: "bg-zinc-600" },
                                { id: "warning", label: "Draft", dot: "bg-amber-500" },
                                { id: "review", label: "Review", dot: "bg-purple-500" },
                              ].map((tone) => (
                                <button
                                  key={tone.id}
                                  type="button"
                                  onClick={() => setAnnotationTone(tone.id as any)}
                                  className={`py-1 px-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    annotationTone === tone.id
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                                  <span>{tone.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Interactive 3x3 Grid Placement & Page Scope */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          {/* 3x3 Placement Grid */}
                          <div className="sm:col-span-5 space-y-1">
                            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Placement Position (9-Grid)
                            </label>
                            <div className="grid grid-cols-3 gap-1 max-w-[160px]">
                              {[
                                { pos: "top-left", label: "TL" },
                                { pos: "top-center", label: "TC" },
                                { pos: "top-right", label: "TR" },
                                { pos: "middle-left", label: "ML" },
                                { pos: "center", label: "C" },
                                { pos: "middle-right", label: "MR" },
                                { pos: "bottom-left", label: "BL" },
                                { pos: "bottom-center", label: "BC" },
                                { pos: "bottom-right", label: "BR" },
                              ].map((item) => (
                                <button
                                  key={item.pos}
                                  type="button"
                                  onClick={() => setAnnotationPosition(item.pos as any)}
                                  className={`h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    annotationPosition === item.pos
                                      ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-600"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Page Scope & Rotation */}
                          <div className="sm:col-span-7 space-y-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Target Pages
                              </label>
                              <div className="grid grid-cols-2 gap-1">
                                {[
                                  { id: "all", label: "All Pages" },
                                  { id: "first", label: "Cover (1st)" },
                                  { id: "last", label: "Last Page" },
                                  { id: "custom", label: "Custom Range" },
                                ].map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setAnnotationScope(s.id as any)}
                                    className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                      annotationScope === s.id
                                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                              {annotationScope === "custom" && (
                                <input
                                  type="text"
                                  value={annotationCustomPages}
                                  onChange={(e) => setAnnotationCustomPages(e.target.value)}
                                  placeholder="e.g. 1-2, 4"
                                  className="w-full mt-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono"
                                />
                              )}
                            </div>

                            {/* Angle Presets */}
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">Rotation Angle</span>
                                <span className="font-mono text-[11px] text-zinc-500">{annotationRotation}°</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[
                                  { deg: 0, label: "0°" },
                                  { deg: -12, label: "-12°" },
                                  { deg: 15, label: "+15°" },
                                  { deg: -45, label: "-45°" },
                                ].map((item) => (
                                  <button
                                    key={item.deg}
                                    type="button"
                                    onClick={() => setAnnotationRotation(item.deg)}
                                    className={`py-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                      annotationRotation === item.deg
                                        ? "bg-purple-600 text-white shadow-xs"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Opacity Slider */}
                        <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">Stamp Opacity</span>
                            <span className="font-mono text-[11px] text-zinc-500">{Math.round(annotationOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.05"
                            value={annotationOpacity}
                            onChange={(e) => setAnnotationOpacity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "pdf-forms" && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-300 text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Form Security & Field Flattening
                    </p>
                    <p className="text-[11px] leading-relaxed text-purple-700 dark:text-purple-400">
                      Scans the document for interactive AcroForm widgets, text inputs, and checkboxes, and permanently flattens them into immutable vector content to prevent unauthorized tampering.
                    </p>
                  </div>
                )}

                {toolId === "ocr-pdf" && (
                  <div className="space-y-4">
                    {/* Mode Selector Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          OCR &amp; Audit Engine Mode
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Zero Cloud Uploads
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Mode 1: Digital Stream Audit */}
                        <div
                          onClick={() => setOcrMode("audit")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            ocrMode === "audit"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <ScanText className="w-3.5 h-3.5" /> Digital Audit
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  ocrMode === "audit"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                }`}
                              >
                                In-Browser
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                ocrMode === "audit" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Extract font streams, text density, and compute searchability index without external servers.
                            </p>
                          </div>
                        </div>

                        {/* Mode 2: Gemini Vision OCR */}
                        <div
                          onClick={() => setOcrMode("vision")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            ocrMode === "vision"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Vision OCR
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  ocrMode === "vision"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300"
                                }`}
                              >
                                Gemini 2.5
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                ocrMode === "vision" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Multimodal AI vision OCR for scanned photos, handwriting, degraded scans, and receipts.
                            </p>
                          </div>
                        </div>

                        {/* Mode 3: Searchable PDF */}
                        <div
                          onClick={() => setOcrMode("searchable_pdf")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            ocrMode === "searchable_pdf"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" /> Searchable PDF
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  ocrMode === "searchable_pdf"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                }`}
                              >
                                Sandwich
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                ocrMode === "searchable_pdf" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Injects an invisible selectable text layer into the PDF so scans become copyable and Ctrl+F searchable.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Page Range Filter */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-zinc-900 dark:text-zinc-100">
                          Target Page Range
                        </label>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          e.g. &quot;all&quot; or &quot;1-3, 5&quot;
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ocrPageRange}
                          onChange={(e) => setOcrPageRange(e.target.value)}
                          placeholder="all"
                          className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setOcrPageRange("all")}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                            ocrPageRange === "all"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setOcrPageRange("1")}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          P.1
                        </button>
                      </div>
                    </div>

                    {/* Pre-flight Live Pages Grid */}
                    {ocrPagesList.length > 0 && (
                      <div className="space-y-2 text-left">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-600" /> Pre-Flight Document Check ({ocrPagesList.length} Pages)
                          </span>
                          {isLoadingOcrThumbnails && (
                            <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Scanning layers...
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                          {ocrPagesList.map((item) => (
                            <div
                              key={item.pageNum}
                              className="p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between"
                            >
                              <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative flex items-center justify-center">
                                {item.thumbnailUrl ? (
                                  <img src={item.thumbnailUrl} alt={`Page ${item.pageNum}`} className="w-full h-full object-contain" />
                                ) : (
                                  <FileText className="w-6 h-6 text-zinc-400" />
                                )}
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[11px] font-bold">
                                  {item.pageNum}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                                    item.classification === "digital"
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                      : item.classification === "scanned"
                                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  {item.classification || "..."}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-500">
                                  {item.wordCount !== undefined ? `${item.wordCount}w` : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {toolId === "pdf-to-word" && (
                  <div className="space-y-4 text-left">
                    {/* Strategy Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          Conversion Strategy &amp; Layout
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Native .docx Formatting
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Option 1: Flowing Document */}
                        <div
                          onClick={() => setWordLayoutMode("flowing")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            wordLayoutMode === "flowing"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Flowing Text
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  wordLayoutMode === "flowing"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                                }`}
                              >
                                Popular
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                wordLayoutMode === "flowing"
                                  ? "text-zinc-300 dark:text-zinc-700"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Smooth paragraph reflow, de-hyphenation, headings &amp; bullet lists for effortless editing.
                            </p>
                          </div>
                        </div>

                        {/* Option 2: Page Preserved */}
                        <div
                          onClick={() => setWordLayoutMode("page_preserved")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            wordLayoutMode === "page_preserved"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" /> Page Preserved
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  wordLayoutMode === "page_preserved"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                }`}
                              >
                                Strict
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                wordLayoutMode === "page_preserved"
                                  ? "text-zinc-300 dark:text-zinc-700"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Inserts explicit Word page breaks to preserve original page-for-page document boundaries.
                            </p>
                          </div>
                        </div>

                        {/* Option 3: Tables & Grids */}
                        <div
                          onClick={() => setWordLayoutMode("structured_tables")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            wordLayoutMode === "structured_tables"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Data &amp; Tables
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                                  wordLayoutMode === "structured_tables"
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                    : "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                }`}
                              >
                                Tables
                              </span>
                            </div>
                            <p
                              className={`text-[11px] leading-relaxed ${
                                wordLayoutMode === "structured_tables"
                                  ? "text-zinc-300 dark:text-zinc-700"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              Prioritizes multi-column alignment detection to reconstruct invoices, spreadsheets &amp; data grids.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Styling Theme & Typography */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-1.5">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          Typography &amp; Heading Style
                        </label>
                        <select
                          value={wordStyleTheme}
                          onChange={(e) => setWordStyleTheme(e.target.value as WordStyleTheme)}
                          className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                        >
                          <option value="modern">Modern Executive (Calibri / Slate)</option>
                          <option value="classic">Classic Formal (Times New Roman / Navy)</option>
                          <option value="minimal">Tech Minimal (Arial / Monochrome)</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Applies professional font pairings, heading hierarchy, and spacing.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          Document Features
                        </label>
                        <div className="space-y-1.5 pt-0.5">
                          <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wordIncludePageNumbers}
                              onChange={(e) => setWordIncludePageNumbers(e.target.checked)}
                              className="rounded text-zinc-950 dark:text-white focus:ring-0 cursor-pointer"
                            />
                            <span>Include dynamic footer page numbers (&quot;Page X of Y&quot;)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wordDetectTables}
                              onChange={(e) => setWordDetectTables(e.target.checked)}
                              className="rounded text-zinc-950 dark:text-white focus:ring-0 cursor-pointer"
                            />
                            <span>Auto-reconstruct tabular grids into Word tables</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Page Range Filter */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-zinc-900 dark:text-zinc-100">
                          Target Page Range
                        </label>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          e.g. &quot;all&quot; or &quot;1-3, 5&quot;
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={wordPageRange}
                          onChange={(e) => setWordPageRange(e.target.value)}
                          placeholder="all"
                          className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setWordPageRange("all")}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                            wordPageRange === "all"
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setWordPageRange("1")}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          P.1
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "pdf-to-excel" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Table Structure &amp; Column Clustering
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Native .xlsx Format
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Include Page Metadata Column
                          </label>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Prepends a &quot;Page #&quot; column indicating source document page for each table row
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={pdfToExcelIncludePage}
                          onChange={(e) => setPdfToExcelIncludePage(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-wrap gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                          Spatial Column Alignment
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Auto-Row Clustering
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          100% Client-Side
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "pdf-to-pdfa" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        ISO 19005 Archival Conformance
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Legal Long-Term Preservation
                      </span>
                    </div>

                    {/* Conformance Level */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Conformance Profile Level
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { level: "PDF/A-2b" as const, title: "PDF/A-2b", subtitle: "ISO 19005-2 Standard", tag: "Recommended", desc: "Modern visual preservation with transparent layer support" },
                          { level: "PDF/A-1b" as const, title: "PDF/A-1b", subtitle: "ISO 19005-1 Legacy", tag: "Strict", desc: "Basic visual conformance for government & court archives" },
                          { level: "PDF/A-3b" as const, title: "PDF/A-3b", subtitle: "ISO 19005-3 Extended", tag: "Extended", desc: "Supports embedded attachments and raw data payloads" },
                        ].map((item) => (
                          <div
                            key={item.level}
                            onClick={() => setPdfaLevel(item.level)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                              pdfaLevel === item.level
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold">{item.title}</span>
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    pdfaLevel === item.level
                                      ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                      : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                                  }`}
                                >
                                  {item.tag}
                                </span>
                              </div>
                              <p
                                className={`text-[10px] leading-relaxed ${
                                  pdfaLevel === item.level
                                    ? "text-zinc-300 dark:text-zinc-600"
                                    : "text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Color Profile */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Color Space Profile
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { profile: "sRGB" as const, label: "sRGB Display Profile", desc: "Standard for digital screens & monitors" },
                          { profile: "DeviceCMYK" as const, label: "DeviceCMYK Print Profile", desc: "Optimized for archival printing & presses" },
                        ].map((item) => (
                          <button
                            key={item.profile}
                            type="button"
                            onClick={() => setPdfaColorProfile(item.profile)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              pdfaColorProfile === item.profile
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                pdfaColorProfile === item.profile
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {item.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "pdf-to-powerpoint" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        Presentation Slide Extraction Studio
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Slide Deck Package (ZIP)
                      </span>
                    </div>

                    {/* Slide Resolution */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Slide Rendering Resolution
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { dpi: 1.5, label: "150 DPI Crisp", desc: "Recommended for slide shows", badge: "Balanced" },
                          { dpi: 2.0, label: "300 DPI Ultra HD", desc: "Maximum 4K presentation clarity", badge: "Ultra" },
                          { dpi: 1.0, label: "96 DPI Standard", desc: "Compact size for email decks", badge: "Fast" },
                        ].map((item) => (
                          <div
                            key={item.dpi}
                            onClick={() => setSlidesDpi(item.dpi)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                              slidesDpi === item.dpi
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold">{item.label}</span>
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    slidesDpi === item.dpi
                                      ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                      : "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              </div>
                              <p
                                className={`text-[10px] leading-relaxed ${
                                  slidesDpi === item.dpi
                                    ? "text-zinc-300 dark:text-zinc-600"
                                    : "text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Image Format */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Slide Image Format
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { format: "jpeg" as const, label: "JPEG Optimized", desc: "High visual fidelity with compact compression" },
                          { format: "png" as const, label: "PNG Lossless", desc: "Pixel-perfect rasterization with alpha support" },
                        ].map((item) => (
                          <button
                            key={item.format}
                            type="button"
                            onClick={() => setSlidesFormat(item.format)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              slidesFormat === item.format
                                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                slidesFormat === item.format
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {item.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {toolId === "ai-summarizer" && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Executive AI Synthesis
                      </span>
                      <span className="text-[11px] font-mono bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                        Gemini 2.5 Flash
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300">
                      Generates executive summary, strategic takeaways, legal/operational risks, and actionable next steps powered by Google Gemini.
                    </p>
                  </div>
                )}

                {toolId === "translate-pdf" && (
                  <div className="space-y-4">
                    {/* Presets Header Bar */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Bilingual Translation Presets
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          6 Pre-Configured Workflows
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {TRANSLATION_PRESETS.map((preset) => {
                          const isActive = translateActivePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setTranslateActivePreset(preset.id);
                                setTargetLanguage(preset.targetLanguage);
                                setTranslateLayoutMode(preset.layoutMode);
                              }}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isActive
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                              }`}
                            >
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {preset.name}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-mono mt-1 truncate">
                                {preset.targetLanguage}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2-Column Studio: Left Preview Canvas, Right Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left: A4 Bilingual Layout Mockup & Wireframe */}
                      <div className="lg:col-span-5 flex flex-col items-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> A4 Layout Preview
                          </span>
                          <span className="text-[11px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                            Dual-Column PDF
                          </span>
                        </div>

                        {/* A4 Sheet Container */}
                        <div className="relative w-full max-w-[270px] aspect-[1/1.414] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-md p-3.5 flex flex-col justify-between select-none">
                          {/* Document Top Header */}
                          <div className="space-y-1 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider">
                                DocDrop Bilingual Studio
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {targetLanguage}
                              </span>
                            </div>
                            <div className="h-1.5 w-1/2 bg-zinc-800 dark:bg-zinc-200 rounded" />
                          </div>

                          {/* Dual Column Content Representation */}
                          {translateLayoutMode === "side_by_side" ? (
                            <div className="relative grid grid-cols-2 gap-2 my-auto py-2 text-[11px] leading-tight">
                              {/* Central dividing rule */}
                              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-200 dark:bg-zinc-800 -translate-x-1/2" />

                              {/* Left: Original (EN) */}
                              <div className="space-y-2 pr-1 text-left">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">
                                  SOURCE (EN)
                                </span>
                                <div className="space-y-1">
                                  <div className="h-1.5 w-3/4 bg-zinc-400 dark:bg-zinc-600 rounded" />
                                  <div className="h-1 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                  <div className="h-1 w-5/6 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                </div>
                                <div className="space-y-1 pt-1">
                                  <div className="h-1.5 w-2/3 bg-zinc-400 dark:bg-zinc-600 rounded" />
                                  <div className="h-1 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                  <div className="h-1 w-4/5 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                </div>
                              </div>

                              {/* Right: Translated */}
                              <div className="space-y-2 pl-1 text-left">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono block truncate">
                                  {targetLanguage.toUpperCase()}
                                </span>
                                <div className="space-y-1">
                                  <div className="h-1.5 w-3/4 bg-indigo-400 dark:bg-indigo-600 rounded" />
                                  <div className="h-1 w-full bg-indigo-200 dark:bg-indigo-900/60 rounded" />
                                  <div className="h-1 w-5/6 bg-indigo-200 dark:bg-indigo-900/60 rounded" />
                                </div>
                                <div className="space-y-1 pt-1">
                                  <div className="h-1.5 w-2/3 bg-indigo-400 dark:bg-indigo-600 rounded" />
                                  <div className="h-1 w-full bg-indigo-200 dark:bg-indigo-900/60 rounded" />
                                  <div className="h-1 w-4/5 bg-indigo-200 dark:bg-indigo-900/60 rounded" />
                                </div>
                              </div>
                            </div>
                          ) : translateLayoutMode === "interlinear" ? (
                            <div className="my-auto space-y-2 py-2 text-left">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono block">
                                Interlinear Parallel Lines
                              </span>
                              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 space-y-1">
                                <div className="h-1.5 w-full bg-zinc-700 dark:bg-zinc-300 rounded" />
                                <div className="h-1.5 w-11/12 bg-indigo-500 dark:bg-indigo-400 rounded" />
                              </div>
                              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 space-y-1">
                                <div className="h-1.5 w-full bg-zinc-700 dark:bg-zinc-300 rounded" />
                                <div className="h-1.5 w-4/5 bg-indigo-500 dark:bg-indigo-400 rounded" />
                              </div>
                            </div>
                          ) : (
                            <div className="my-auto space-y-2 py-2 text-left">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono block">
                                Monolingual ({targetLanguage}) Publication
                              </span>
                              <div className="space-y-1.5">
                                <div className="h-2 w-1/2 bg-indigo-600 dark:bg-indigo-400 rounded" />
                                <div className="h-1.5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
                                <div className="h-1.5 w-11/12 bg-zinc-300 dark:bg-zinc-700 rounded" />
                                <div className="h-1.5 w-4/5 bg-zinc-300 dark:bg-zinc-700 rounded" />
                              </div>
                            </div>
                          )}

                          {/* Document Bottom Footer */}
                          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                            <span>Page 1 of 1</span>
                            <span>100% In-Browser Memory</span>
                          </div>
                        </div>

                        {/* Readout Summary */}
                        <div className="w-full text-center pt-2 border-t border-zinc-200/70 dark:border-zinc-800 space-y-0.5">
                          <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold truncate">
                            {translateLayoutMode.replace(/_/g, " ")} • {targetLanguage}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            Outputs: Bilingual PDF + Side-by-Side Markdown + HTML App
                          </p>
                        </div>
                      </div>

                      {/* Right: Detailed Configuration Panel */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* Target Language Selection Grid */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Target Language
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { id: "Spanish", native: "Español" },
                              { id: "French", native: "Français" },
                              { id: "German", native: "Deutsch" },
                              { id: "Chinese", native: "中文" },
                              { id: "Japanese", native: "日本語" },
                              { id: "Hindi", native: "हिन्दी" },
                              { id: "Portuguese", native: "Português" },
                              { id: "Italian", native: "Italiano" },
                              { id: "Arabic", native: "العربية" },
                              { id: "Russian", native: "Русский" },
                            ].map((lang) => (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => {
                                  setTargetLanguage(lang.id as any);
                                  setTranslateActivePreset("");
                                }}
                                className={`py-1.5 px-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  targetLanguage === lang.id
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                }`}
                              >
                                <span className="block text-xs font-bold truncate">{lang.id}</span>
                                <span className={`text-[11px] block truncate ${targetLanguage === lang.id ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}>
                                  {lang.native}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bilingual Layout Architecture Modes */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Layout Architecture
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              {
                                id: "side_by_side" as const,
                                title: "Side-by-Side Dual Column",
                                desc: "Original on left, translation on right with vertical divider.",
                                badge: "Legal & Contracts",
                              },
                              {
                                id: "interlinear" as const,
                                title: "Interlinear Parallel Lines",
                                desc: "Alternating line-by-line format for sentence audit.",
                                badge: "Auditing & Proofing",
                              },
                              {
                                id: "monolingual_target" as const,
                                title: "Monolingual Target Document",
                                desc: "Clean publication format translated solely in target language.",
                                badge: "Publishing",
                              },
                              {
                                id: "vocabulary_glossary" as const,
                                title: "Vocabulary & Terms Glossary",
                                desc: "Key phrase translation table and domain terminology glossary.",
                                badge: "Localization",
                              },
                            ].map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => {
                                  setTranslateLayoutMode(mode.id);
                                  setTranslateActivePreset("");
                                }}
                                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                  translateLayoutMode === mode.id
                                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {mode.title}
                                  </span>
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                                    {mode.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                                  {mode.desc}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Export & Generation Toggles */}
                        <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Generation & Output Options
                          </label>
                          <div className="space-y-1.5">
                            <label className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-colors">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={translateIncludePdf}
                                  onChange={(e) => setTranslateIncludePdf(e.target.checked)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                                    Compile Dual-Column Bilingual PDF Document
                                  </span>
                                  <span className="text-[11px] text-zinc-500 block">
                                    Generates clean, printable A4 PDF in browser memory with pdf-lib.
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                PDF + MD
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Engine Architecture Callout */}
                        <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-2.5">
                          <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-left">
                            <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                              Hybrid Neural AI + Offline Client Engine
                            </p>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                              Uses Google Gemini 2.5 Flash for high-fluency neural document localization, backed by DocDrop&apos;s client-side linguistic dictionary engine for guaranteed zero-leakage offline execution.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Compression Progress Bar */}
                {isProcessing && compressionProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{compressionProgress.status}</span>
                      <span className="font-mono tnum text-emerald-600 dark:text-emerald-400">
                        {compressionProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, compressionProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Watermark Progress Bar */}
                {isProcessing && watermarkProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{watermarkProgress.message}</span>
                      <span className="font-mono tnum text-purple-600 dark:text-purple-400">
                        {watermarkProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, watermarkProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Annotate Progress Bar */}
                {isProcessing && annotateProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{annotateProgress.message}</span>
                      <span className="font-mono tnum text-purple-600 dark:text-purple-400">
                        {annotateProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, annotateProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Split Progress Bar */}
                {isProcessing && splitProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{splitProgress.message}</span>
                      <span className="font-mono tnum text-rose-600 dark:text-rose-400">
                        {splitProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, splitProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Remove Progress Bar */}
                {isProcessing && removeProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{removeProgress.message}</span>
                      <span className="font-mono tnum text-rose-600 dark:text-rose-400">
                        {removeProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, removeProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Repair Progress Bar */}
                {isProcessing && repairProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{repairProgress.message}</span>
                      <span className="font-mono tnum text-emerald-600 dark:text-emerald-400">
                        {repairProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, repairProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live OCR Audit Progress Bar */}
                {isProcessing && ocrProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{ocrProgress.message}</span>
                      <span className="font-mono tnum text-emerald-600 dark:text-emerald-400">
                        {ocrProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, ocrProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live PDF to Word Progress Bar */}
                {isProcessing && wordProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{wordProgress.message}</span>
                      <span className="font-mono tnum text-blue-600 dark:text-blue-400">
                        {wordProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, wordProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Watermark Progress Bar */}
                {isProcessing && watermarkProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{watermarkProgress.message}</span>
                      <span className="font-mono tnum text-purple-600 dark:text-purple-400">
                        {watermarkProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 dark:bg-purple-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, watermarkProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Page Numbers Progress Bar */}
                {isProcessing && numberProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{numberProgress.message}</span>
                      <span className="font-mono tnum text-purple-600 dark:text-purple-400">
                        {numberProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 dark:bg-purple-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, numberProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Translate Progress Bar */}
                {isProcessing && translateProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{translateProgress.message}</span>
                      <span className="font-mono tnum text-indigo-600 dark:text-indigo-400">
                        {translateProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, translateProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Sign PDF Progress Bar */}
                {isProcessing && signProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{signProgress.message}</span>
                      <span className="font-mono tnum text-sky-600 dark:text-sky-400">
                        {signProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 dark:bg-sky-400 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, signProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Redact PDF Progress Bar */}
                {isProcessing && redactProgress && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white">
                      <span>{redactProgress.message}</span>
                      <span className="font-mono tnum text-rose-600 dark:text-rose-400">
                        {redactProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 dark:bg-rose-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, redactProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Word to PDF Studio Configuration */}
                {toolId === "word-to-pdf" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-500" /> Word to PDF Layout &amp; Typography
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Preserves document headings, bullet points, tables &amp; formatting
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Memory
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      {/* Page Size */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Paper Size
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "a4", label: "A4 Standard" },
                            { id: "letter", label: "US Letter" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setWordToPdfPageSize(s.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                wordToPdfPageSize === s.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Typography */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Typography Style
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "helvetica", label: "Modern" },
                            { id: "times", label: "Classic" },
                            { id: "courier", label: "Mono" },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setWordToPdfFont(f.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                wordToPdfFont === f.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Margins */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Document Margins
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "compact", label: "Tight" },
                            { id: "standard", label: "Normal" },
                            { id: "spacious", label: "Wide" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setWordToPdfMargin(m.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                wordToPdfMargin === m.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setWordToPdfIncludeHeader(!wordToPdfIncludeHeader)}
                      className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={wordToPdfIncludeHeader}
                          onChange={(e) => setWordToPdfIncludeHeader(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-950 dark:accent-white cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          Include Document Header with Title Bar
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {wordToPdfIncludeHeader ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Excel to PDF Studio Configuration */}
                {toolId === "excel-to-pdf" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Spreadsheet to PDF Table Layout
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Converts sheets into structured tabular rows with automatic column scaling
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> High-Density Grid
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      {/* Orientation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Table Orientation
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "landscape", label: "Landscape (Wide Tables)" },
                            { id: "portrait", label: "Portrait (Tall Lists)" },
                          ].map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setExcelOrientation(o.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                excelOrientation === o.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Theme */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Table Style Theme
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "corporate_blue", label: "Corporate" },
                            { id: "minimalist", label: "Minimal" },
                            { id: "financial_green", label: "Financial" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setExcelTheme(t.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                excelTheme === t.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setExcelShowGridlines(!excelShowGridlines)}
                      className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={excelShowGridlines}
                          onChange={(e) => setExcelShowGridlines(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-950 dark:accent-white cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          Print Visible Table Border Gridlines
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {excelShowGridlines ? "Lines Active" : "Clean Borderless"}
                      </span>
                    </div>
                  </div>
                )}

                {/* HTML to PDF Studio Configuration */}
                {toolId === "html-to-pdf" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <FileCode2 className="w-4 h-4 text-amber-500" /> HTML &amp; Webpage Rendering Layout
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Renders HTML markup, heading hierarchies, tables &amp; block elements
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> DOM Flow Engine
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      {/* Orientation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Orientation
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "portrait", label: "Portrait" },
                            { id: "landscape", label: "Landscape" },
                          ].map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setHtmlOrientation(o.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                htmlOrientation === o.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Paper Size */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Paper Size
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "a4", label: "A4 Standard" },
                            { id: "letter", label: "US Letter" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setHtmlPageSize(s.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                htmlPageSize === s.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Margins */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Margins
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "compact", label: "Tight" },
                            { id: "standard", label: "Normal" },
                            { id: "spacious", label: "Wide" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setHtmlMargin(m.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                htmlMargin === m.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF to JPG Studio Configuration */}
                {toolId === "pdf-to-jpg" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-blue-500" /> Image Extraction &amp; Rasterization Quality
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Renders each page to high-DPI canvas frames and bundles into a ZIP archive
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> High-DPI Canvas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                      {/* DPI Resolution */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Image Quality &amp; DPI
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { dpi: 1.5, label: "150 DPI Crisp" },
                            { dpi: 2.0, label: "300 DPI Ultra" },
                            { dpi: 1.0, label: "96 DPI Standard" },
                          ].map((d) => (
                            <button
                              key={d.dpi}
                              type="button"
                              onClick={() => setPdfToJpgDpi(d.dpi)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                pdfToJpgDpi === d.dpi
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Format */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Output Format
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          {[
                            { id: "jpeg", label: "JPG (High Quality)" },
                            { id: "png", label: "PNG (Lossless)" },
                          ].map((fmt) => (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => setPdfToJpgFormat(fmt.id as any)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                pdfToJpgFormat === fmt.id
                                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                              }`}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <p>{error}</p>
                      {(error.toLowerCase().includes("limit") || error.toLowerCase().includes("upgrade")) && (
                        <button
                          type="button"
                          onClick={onOpenPricing}
                          className="font-bold text-rose-900 dark:text-rose-200 underline hover:no-underline cursor-pointer"
                        >
                          View affordable Pro plans (from ₹49) &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={resetState}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={executeTool}
                    disabled={
                      isProcessing ||
                      (toolId === "remove-pages" &&
                        removePagesList.length > 0 &&
                        (removePagesList.filter((p) => p.markedForRemoval).length >= removePagesList.length ||
                          removePagesList.filter((p) => p.markedForRemoval).length === 0))
                    }
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs transition-colors cursor-pointer min-w-[140px] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                      </span>
                    ) : toolId === "ocr-pdf" ? (
                      ocrMode === "searchable_pdf"
                        ? "Generate Searchable PDF"
                        : ocrMode === "vision"
                        ? "Run Vision OCR"
                        : "Run Layer Audit"
                    ) : toolId === "pdf-to-word" ? (
                      "Convert to Word (.docx)"
                    ) : toolId === "edit-pdf" ? (
                      "Apply Annotation Stamp"
                    ) : toolId === "add-watermark" ? (
                      "Apply Watermark"
                    ) : toolId === "add-page-numbers" ? (
                      "Apply Page Numbers"
                    ) : toolId === "translate-pdf" ? (
                      "Translate PDF Layout"
                    ) : toolId === "sign-pdf" ? (
                      "Stamp Certified Signature"
                    ) : toolId === "redact-pdf" ? (
                      "Burn Permanent Redactions"
                    ) : toolId === "scan-to-pdf" ? (
                      `Compile ${(imageItems.length || multiFiles.length)} Scan${(imageItems.length || multiFiles.length) === 1 ? "" : "s"} into PDF`
                    ) : toolId === "jpg-to-pdf" ? (
                      `Convert ${(imageItems.length || multiFiles.length)} Image${(imageItems.length || multiFiles.length) === 1 ? "" : "s"} to PDF`
                    ) : toolId === "word-to-pdf" ? (
                      "Convert Word to PDF"
                    ) : toolId === "excel-to-pdf" ? (
                      "Convert Spreadsheet to PDF"
                    ) : toolId === "html-to-pdf" ? (
                      "Render HTML to PDF"
                    ) : toolId === "pdf-to-jpg" ? (
                      `Extract Pages to ${pdfToJpgFormat.toUpperCase()} (ZIP)`
                    ) : toolId === "pdf-to-powerpoint" ? (
                      `Extract Slides to ${slidesFormat.toUpperCase()} (ZIP)`
                    ) : toolId === "pdf-to-excel" ? (
                      "Extract Tables to Excel (.xlsx)"
                    ) : toolId === "pdf-to-pdfa" ? (
                      `Standardize to ${pdfaLevel} Archival PDF`
                    ) : toolId === "rotate-pdf" ? (
                      `Rotate ${rotatePageScope === "all" ? "All" : rotatePageScope === "odd" ? "Odd" : rotatePageScope === "even" ? "Even" : "Selected"} Pages (+${rotateAngle}°)`
                    ) : (
                      `Execute ${details.title.split(" ")[0]}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Result View */
          <motion.div
            key="tool-result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: motionTokens.duration.standard }}
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-8 shadow-xs space-y-6 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-1">
                Processing Completed Successfully!
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{result.meta}</p>
            </div>

            {/* Compression Savings Report Card */}
            {result.compressionStats && (
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Compression Results
                    </span>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                      Document Size Optimization Report
                    </h4>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{result.compressionStats.savingsPercent}% Space Saved</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Original File Size</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {(result.compressionStats.originalSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Compressed Size</span>
                    <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">
                      {(result.compressionStats.compressedSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Total Reduction</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {(result.compressionStats.savingsBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>
                    Strategy: <strong className="text-zinc-800 dark:text-zinc-200 capitalize">{result.compressionStats.strategyUsed.replace("_", " ")}</strong> ({result.compressionStats.level} mode)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Memory
                  </span>
                </div>
              </div>
            )}

            {/* Repair Diagnostic Report Card */}
            {result.repairStats && (
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Recovery Inspection
                    </span>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                      Document Repair &amp; Health Audit
                    </h4>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{result.repairStats.healthScore}% Document Health Restored</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Original File Size</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {(result.repairStats.originalSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Repaired Size</span>
                    <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">
                      {(result.repairStats.repairedSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Pages Salvaged</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.repairStats.totalPages} {result.repairStats.totalPages === 1 ? "Page" : "Pages"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Issues Repaired</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.repairStats.issuesRepaired} Fixed
                    </p>
                  </div>
                </div>

                {/* Diagnostic Item List */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                    Diagnostic Checkpoints
                  </span>
                  <div className="space-y-1.5">
                    {result.repairStats.diagnostics.map((diag) => (
                      <div
                        key={diag.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5 text-xs"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase shrink-0 mt-0.5 ${
                            diag.status === "repaired" || diag.status === "recovered"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : diag.status === "cleaned"
                              ? "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {diag.status}
                        </span>
                        <div className="space-y-0.5">
                          <span className="font-bold text-zinc-950 dark:text-white block">
                            {diag.category}
                          </span>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal">
                            {diag.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>
                    Strategy: <strong className="text-zinc-800 dark:text-zinc-200">{result.repairStats.strategyUsed}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Memory
                  </span>
                </div>
              </div>
            )}

            {/* OCR Text Layer Audit Result Dashboard */}
            {result.ocrStats && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-4 text-left">
                {/* Header with Searchability Gauge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-mono font-bold border ${
                        result.ocrStats.audit.summary.searchabilityScore >= 75
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          : result.ocrStats.audit.summary.searchabilityScore >= 40
                          ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                          : "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      <span className="text-sm leading-none">{result.ocrStats.audit.summary.searchabilityScore}%</span>
                      <span className="text-[11px] font-sans font-medium uppercase tracking-tight">Index</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ScanText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {result.ocrStats.audit.summary.documentClassification}
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">
                        {result.ocrStats.audit.summary.summaryText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono uppercase bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {result.ocrStats.mode === "searchable_pdf"
                        ? "Sandwich PDF"
                        : result.ocrStats.mode === "vision"
                        ? "Vision OCR"
                        : "Digital Stream"}
                    </span>
                  </div>
                </div>

                {/* Metric Grid (4 cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Extractable Words</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.ocrStats.audit.summary.totalWords.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Digital vs Scanned</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.ocrStats.audit.summary.digitalPagesCount} <span className="text-xs text-zinc-400">/</span> {result.ocrStats.audit.summary.scannedPagesCount}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Embedded Fonts</span>
                    <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">
                      {result.ocrStats.audit.summary.uniqueFonts.length} Types
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Total Characters</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.ocrStats.audit.summary.totalChars.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Result View Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setOcrActiveTab("text")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        ocrActiveTab === "text"
                          ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      Extracted Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrActiveTab("pages")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        ocrActiveTab === "pages"
                          ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      Page Audit Table ({result.ocrStats.audit.pages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrActiveTab("fonts")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        ocrActiveTab === "fonts"
                          ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      Font Inventory ({result.ocrStats.audit.summary.uniqueFonts.length})
                    </button>
                  </div>

                  {/* Tab 1: Text Reader */}
                  {ocrActiveTab === "text" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1 max-w-xs">
                          <input
                            type="text"
                            placeholder="Search in extracted text..."
                            value={ocrSearchQuery}
                            onChange={(e) => setOcrSearchQuery(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyText}
                            className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                          >
                            {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {hasCopiedText ? "Copied" : "Copy All Text"}
                          </button>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {ocrSearchQuery
                          ? result.textContent
                              ?.split("\n")
                              .filter((l) => l.toLowerCase().includes(ocrSearchQuery.toLowerCase()))
                              .join("\n") || "No matching lines found."
                          : result.textContent}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Page Audit Table */}
                  {ocrActiveTab === "pages" && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {result.ocrStats.audit.pages.map((p) => (
                        <div
                          key={p.pageNumber}
                          className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                              {p.pageNumber}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase ${
                                    p.classification === "digital"
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                      : p.classification === "hybrid"
                                      ? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300"
                                      : p.classification === "scanned"
                                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  {p.classification}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  {p.width} × {p.height} pt
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1 mt-1 font-mono">
                                {p.textSnippet}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] font-mono shrink-0 self-end sm:self-auto">
                            <span className="text-zinc-700 dark:text-zinc-300">
                              <strong>{p.wordCount}</strong> words
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {p.searchabilityScore}% Score
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Font Inventory */}
                  {ocrActiveTab === "fonts" && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                        Embedded Font Stream Directory ({result.ocrStats.audit.summary.uniqueFonts.length})
                      </span>
                      {result.ocrStats.audit.summary.uniqueFonts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.ocrStats.audit.summary.uniqueFonts.map((font, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold"
                            >
                              {font}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          No embedded vector fonts detected. Document is composed entirely of raster bitmap scans.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Format Specific Quick Downloads */}
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Direct Formats:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([result.ocrStats!.audit.markdownReport], { type: "text/markdown;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_report.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([result.ocrStats!.audit.fullText], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_raw.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(result.ocrStats!.audit, null, 2)], { type: "application/json;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_audit.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    JSON Audit (.json)
                  </button>
                  {result.ocrStats.searchablePdfBytes && (
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([result.ocrStats!.searchablePdfBytes as any], { type: "application/pdf" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_searchable.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold font-mono text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Searchable PDF (.pdf)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Word Document (.docx) Result Info */}
            {result.wordStats && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-4 text-left">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        Editable Word Document (.docx)
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">
                        {result.wordStats.result.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      {result.wordStats.layoutMode.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Total Words</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.wordStats.result.totalWords.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Headings Formatted</span>
                    <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 tnum">
                      {result.wordStats.result.headingsCount} H1-H3
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Tables Reconstructed</span>
                    <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">
                      {result.wordStats.result.tablesCount} Tables
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Paragraphs Reflowed</span>
                    <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tnum">
                      {result.wordStats.result.paragraphsCount}
                    </p>
                  </div>
                </div>

                {/* Document Characteristics Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>
                    Theme: <strong className="text-zinc-800 dark:text-zinc-200 capitalize">{result.wordStats.styleTheme}</strong> • Pages: <strong className="text-zinc-800 dark:text-zinc-200">{result.wordStats.result.totalPages}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Memory
                  </span>
                </div>
              </div>
            )}

            {/* Display rendered images if converting PDF to JPG */}
            {result.images && result.images.length > 0 && (
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Page Image Previews ({result.images.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  {result.images.map((img) => (
                    <div key={img.pageNum} className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
                      <img src={img.dataUrl} alt={`Page ${img.pageNum}`} className="w-full object-contain rounded" />
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono text-center mt-1 tnum">Page {img.pageNum}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Bilingual Translation Workspace */}
            {result.translateStats && (
              <div className="text-left space-y-4">
                {/* Metrics Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Target Language</span>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {result.translateStats.targetLanguage}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Extracted Segments</span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                      {result.translateStats.totalSegments} Blocks
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Words Translated</span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                      ~{result.translateStats.totalWords.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Layout Architecture</span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 capitalize truncate">
                      {result.translateStats.layoutMode.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Workspace Navigation Tabs & Export Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex gap-1">
                    {[
                      { id: "side_by_side" as const, label: "Side-by-Side Table" },
                      { id: "markdown" as const, label: "Markdown Report" },
                      { id: "json" as const, label: "CAT Memory (JSON)" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTranslateActiveTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          translateActiveTab === tab.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Export format buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.translateStats.htmlViewerContent && (
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([result.translateStats!.htmlViewerContent], { type: "text/html" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_viewer.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" /> Save HTML App
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([result.translateStats!.jsonContent], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${result.fileName.replace(/\.[^/.]+$/, "")}_tm.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                    >
                      Export CAT JSON
                    </button>
                  </div>
                </div>

                {/* Tab 1: Interactive Side-by-Side Table with Live Search */}
                {translateActiveTab === "side_by_side" && (
                  <div className="space-y-2.5">
                    {/* Search & Filter Bar */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={translateSearchQuery}
                          onChange={(e) => setTranslateSearchQuery(e.target.value)}
                          placeholder="Search original source or translated text..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <select
                        value={translateFilterType}
                        onChange={(e) => setTranslateFilterType(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="all">All Types</option>
                        <option value="heading">Headings</option>
                        <option value="paragraph">Paragraphs</option>
                        <option value="bullet">Bullet Points</option>
                      </select>
                    </div>

                    {/* Table Container */}
                    <div className="max-h-72 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {result.translateStats.segments
                        .filter((s) => {
                          if (translateFilterType !== "all" && s.type !== translateFilterType) return false;
                          if (!translateSearchQuery.trim()) return true;
                          const q = translateSearchQuery.toLowerCase();
                          return s.sourceText.toLowerCase().includes(q) || s.targetText.toLowerCase().includes(q);
                        })
                        .map((seg, idx) => (
                          <div key={seg.id} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                            <div className="md:col-span-1 text-[11px] font-mono text-zinc-400">
                              #{idx + 1}
                              <span className="block text-[11px] font-semibold text-indigo-500 uppercase mt-0.5">
                                {seg.type.slice(0, 4)}
                              </span>
                            </div>
                            <div className="md:col-span-5 text-zinc-700 dark:text-zinc-300 font-normal leading-relaxed pr-2 border-r border-zinc-100 dark:border-zinc-800/60">
                              {seg.sourceText}
                            </div>
                            <div className="md:col-span-6 text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed flex items-start justify-between gap-2">
                              <span>{seg.targetText || seg.sourceText}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(seg.targetText || seg.sourceText);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0 cursor-pointer"
                                title="Copy translation"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Tab 2: Clean Markdown Report */}
                {translateActiveTab === "markdown" && (
                  <div className="relative">
                    <button
                      onClick={handleCopyText}
                      className="absolute right-3 top-3 flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 transition-colors cursor-pointer z-10"
                    >
                      {hasCopiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {hasCopiedText ? "Copied" : "Copy Markdown"}
                    </button>
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {result.translateStats.markdownContent}
                    </div>
                  </div>
                )}

                {/* Tab 3: CAT JSON */}
                {translateActiveTab === "json" && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {result.translateStats.jsonContent}
                  </div>
                )}
              </div>
            )}

            {/* Certified Digital Signature Audit Trail Card */}
            {result.signStats && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Certified Digital Signature Audit Trail
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Verification ID: {result.signStats.auditId}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                    ISO 32000 Compliant
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Signer Name</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                      {result.signStats.signerName}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Pages Signed</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                      Page(s) {result.signStats.pagesSigned.join(", ")}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Verification Timestamp</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                      {result.signStats.timestamp.split(" ")[0]}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">SHA-256 Digest</span>
                    <p className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 mt-0.5 truncate" title={result.signStats.sha256Digest}>
                      {result.signStats.sha256Digest.slice(0, 12)}...
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  This document was stamped and certified completely inside client-side browser memory. The cryptographic SHA-256 digest guarantees document tamper-evidence without any file upload to external servers.
                </p>
              </div>
            )}

            {/* Certified Redaction & Sanitization Audit Trail Card */}
            {result.redactStats && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Certified Redaction & Sanitization Audit Trail
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Audit ID: {result.redactStats.auditId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                      result.redactStats.rasterized
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {result.redactStats.rasterized ? "Zero-Leak Deep Rasterized" : "Solid Vector Mask"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Items Sanitized</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                      {result.redactStats.redactedCount} location(s)
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Pages Affected</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                      Page(s) {result.redactStats.pagesAffected.join(", ") || "1"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">Sanitization Timestamp</span>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                      {result.redactStats.timestamp.split(" ")[0]}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-500 font-medium">SHA-256 Digest</span>
                    <p
                      className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 mt-0.5 truncate"
                      title={result.redactStats.sha256Digest}
                    >
                      {result.redactStats.sha256Digest.slice(0, 12)}...
                    </p>
                  </div>
                </div>

                {result.redactStats.findings.length > 0 && (
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                      Sanitized Entities & Match Types ({result.redactStats.findings.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {result.redactStats.findings.slice(0, 15).map((f, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-700 dark:text-zinc-300"
                        >
                          P{f.pageNum}: {f.termOrPattern}
                        </span>
                      ))}
                      {result.redactStats.findings.length > 15 && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono text-[11px]">
                          +{result.redactStats.findings.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {result.redactStats.rasterized
                    ? "Deep rasterization physically destroyed all underlying vector font programs and content streams. No text highlighting, copy-pasting, or forensic inspection can recover the original sensitive text."
                    : "Solid blackout mask burned over coordinate boundaries in browser memory without external server transmission."}
                </p>
              </div>
            )}

            {/* Text Report Preview if AI Summarizer or Compare */}
            {result.textContent && !result.ocrStats && !result.translateStats && (
              <div className="text-left space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                    Generated Analysis Report
                  </h4>
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {hasCopiedText ? "Copied" : "Copy Report"}
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {result.textContent}
                </div>
              </div>
            )}

            {/* ZIP Archive Result Info */}
            {result.type === "zip" && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-rose-500" /> Standalone Files ZIP Archive
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                    Zero Cloud Uploads
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Your PDF was split into independent documents in browser memory and packaged into a high-speed ZIP archive ready to download.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer min-w-[200px]"
              >
                <Download className="w-4 h-4" />
                <span>Download {result.fileName.split(".").pop()?.toUpperCase()}</span>
              </motion.button>

              {user && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCloudBackup}
                  disabled={isBackingUp}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving to Cloud...
                    </>
                  ) : cloudBackupSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Backed Up to Cloud!
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" /> Backup to Cloud
                    </>
                  )}
                </motion.button>
              )}

              <button
                type="button"
                onClick={resetState}
                className="px-5 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                Process Another File
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
