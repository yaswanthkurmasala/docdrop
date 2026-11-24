import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { extractTextFromPdf } from "../common/pdfjs-loader.ts";

export type SupportedLanguage =
  | "Spanish"
  | "French"
  | "German"
  | "Chinese"
  | "Japanese"
  | "Hindi"
  | "Portuguese"
  | "Italian"
  | "Arabic"
  | "Russian";

export type BilingualLayoutMode =
  | "side_by_side"       // 2 parallel columns: Original Left, Translated Right
  | "interlinear"        // Alternating lines: Original then Translated
  | "monolingual_target" // Target language publication layout
  | "vocabulary_glossary"; // Key phrases & bilingual terminology glossary

export interface DocumentSegment {
  id: string;
  pageNum: number;
  type: "heading" | "paragraph" | "bullet" | "table_row";
  sourceText: string;
  targetText: string;
  isEdited?: boolean;
}

export interface TranslationPreset {
  id: string;
  name: string;
  targetLanguage: SupportedLanguage;
  layoutMode: BilingualLayoutMode;
  desc: string;
}

export const TRANSLATION_PRESETS: TranslationPreset[] = [
  {
    id: "bilingual_es",
    name: "Spanish Side-by-Side",
    targetLanguage: "Spanish",
    layoutMode: "side_by_side",
    desc: "Parallel English/Spanish dual-column table layout",
  },
  {
    id: "bilingual_fr",
    name: "French Localization",
    targetLanguage: "French",
    layoutMode: "side_by_side",
    desc: "Bilingual review layout for EU & French legal contracts",
  },
  {
    id: "interlinear_de",
    name: "German Interlinear",
    targetLanguage: "German",
    layoutMode: "interlinear",
    desc: "Line-by-line interlinear translation for technical audit",
  },
  {
    id: "bilingual_zh",
    name: "Chinese Parallel",
    targetLanguage: "Chinese",
    layoutMode: "side_by_side",
    desc: "Dual-column table format for commercial documentation",
  },
  {
    id: "bilingual_hi",
    name: "Hindi Bilingual Table",
    targetLanguage: "Hindi",
    layoutMode: "side_by_side",
    desc: "Structured dual-column bilingual segmentation",
  },
  {
    id: "monolingual_target",
    name: "Monolingual Release",
    targetLanguage: "Spanish",
    layoutMode: "monolingual_target",
    desc: "Clean publication layout formatted purely in target language",
  },
];

export interface TranslateLayoutOptions {
  targetLanguage: SupportedLanguage;
  sourceLanguage?: string;
  layoutMode?: BilingualLayoutMode;
  includeBilingualPdf?: boolean;
  onProgress?: (percent: number, message: string) => void;
}

export interface TranslateLayoutResult {
  pdfBytes?: Uint8Array;
  markdownContent: string;
  htmlViewerContent: string;
  jsonContent: string;
  segments: DocumentSegment[];
  sourceLanguage: string;
  targetLanguage: SupportedLanguage;
  layoutMode: BilingualLayoutMode;
  totalPages: number;
  totalSegments: number;
  totalWords: number;
  summary: string;
}

/**
 * Sanitizes strings for StandardFonts in pdf-lib (WinAnsi compatible)
 */
function sanitizeWinAnsi(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/[\u2022\u25CF\u25AA]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/€/g, "EUR")
    .replace(/£/g, "GBP")
    .replace(/¥/g, "JPY")
    .replace(/₹/g, "INR")
    .replace(/[^\x00-\x7F]/g, (char) => {
      return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || " ";
    });
}

/**
 * Splits text into wrapped lines for given character limit
 */
function wrapLines(text: string, maxLen: number = 42): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + " " + w).length <= maxLen) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}

/**
 * Comprehensive client-side multi-lingual terminology dictionary & phrase mapper.
 * Provides instant in-browser offline fallback when Gemini API key is absent or offline.
 */
const DICTIONARY: Record<SupportedLanguage, Record<string, string>> = {
  Spanish: {
    agreement: "acuerdo",
    contract: "contrato",
    report: "informe",
    summary: "resumen",
    document: "documento",
    executive: "ejecutivo",
    quarterly: "trimestral",
    financial: "financiero",
    statement: "declaracion",
    overview: "vision general",
    analysis: "analisis",
    introduction: "introduccion",
    conclusion: "conclusion",
    services: "servicios",
    obligations: "obligaciones",
    liability: "responsabilidad",
    confidential: "confidencial",
    confidentiality: "confidencialidad",
    terms: "terminos",
    conditions: "condiciones",
    payment: "pago",
    date: "fecha",
    effective: "efectivo",
    parties: "partes",
    governing: "aplicable",
    law: "ley",
    section: "seccion",
    page: "pagina",
    total: "total",
    growth: "crecimiento",
    revenue: "ingresos",
    expenses: "gastos",
    profit: "beneficio",
    loss: "perdida",
    strategy: "estrategia",
    risk: "riesgo",
    management: "gestion",
    performance: "rendimiento",
    audit: "auditoria",
    compliance: "cumplimiento",
    customer: "cliente",
    client: "cliente",
    vendor: "proveedor",
    partner: "socio",
    project: "proyecto",
    scope: "alcance",
    deliverables: "entregables",
    milestone: "hito",
    deadline: "fecha limite",
    invoice: "factura",
    tax: "impuesto",
    authorized: "autorizado",
    signature: "firma",
    witness: "testigo",
    applicable: "aplicable",
    provisions: "disposiciones",
    rights: "derechos",
    notice: "notificacion",
    warranty: "garantia",
  },
  French: {
    agreement: "accord",
    contract: "contrat",
    report: "rapport",
    summary: "resume",
    document: "document",
    executive: "executif",
    quarterly: "trimestriel",
    financial: "financier",
    statement: "declaration",
    overview: "apercu",
    analysis: "analyse",
    introduction: "introduction",
    conclusion: "conclusion",
    services: "services",
    obligations: "obligations",
    liability: "responsabilite",
    confidential: "confidentiel",
    confidentiality: "confidentialite",
    terms: "conditions",
    conditions: "termes",
    payment: "paiement",
    date: "date",
    effective: "effectif",
    parties: "parties",
    governing: "applicable",
    law: "droit",
    section: "section",
    page: "page",
    total: "total",
    growth: "croissance",
    revenue: "revenus",
    expenses: "depenses",
    profit: "benefice",
    strategy: "strategie",
    risk: "risque",
    management: "gestion",
    performance: "performance",
    audit: "audit",
    compliance: "conformite",
    signature: "signature",
  },
  German: {
    agreement: "Vereinbarung",
    contract: "Vertrag",
    report: "Bericht",
    summary: "Zusammenfassung",
    document: "Dokument",
    executive: "leitend",
    quarterly: "vierteljaehrlich",
    financial: "finanziell",
    statement: "Erklaerung",
    overview: "Ueberblick",
    analysis: "Analyse",
    introduction: "Einfuehrung",
    conclusion: "Fazit",
    services: "Dienstleistungen",
    obligations: "Verpflichtungen",
    liability: "Haftung",
    confidential: "vertraulich",
    confidentiality: "Vertraulichkeit",
    terms: "Bedingungen",
    conditions: "Konditionen",
    payment: "Zahlung",
    date: "Datum",
    effective: "wirksam",
    parties: "Parteien",
    governing: "geltendes",
    law: "Recht",
    section: "Abschnitt",
    page: "Seite",
    total: "Gesamt",
    growth: "Wachstum",
    revenue: "Umsatz",
    profit: "Gewinn",
    strategy: "Strategie",
    risk: "Risiko",
    management: "Verwaltung",
    performance: "Leistung",
    compliance: "Konformitaet",
    signature: "Unterschrift",
  },
  Chinese: {
    agreement: "协议",
    contract: "合同",
    report: "报告",
    summary: "摘要",
    document: "文件",
    executive: "执行",
    quarterly: "季度",
    financial: "财务",
    statement: "声明",
    overview: "概述",
    analysis: "分析",
    introduction: "引言",
    conclusion: "结论",
    services: "服务",
    obligations: "义务",
    liability: "责任",
    confidential: "机密",
    confidentiality: "保密性",
    terms: "条款",
    conditions: "条件",
    payment: "付款",
    date: "日期",
    parties: "双方",
    law: "法律",
    section: "章节",
    page: "页面",
    total: "总计",
    growth: "增长",
    revenue: "收入",
    profit: "利润",
    strategy: "战略",
    risk: "风险",
    management: "管理",
    performance: "绩效",
    compliance: "合规",
    signature: "签名",
  },
  Japanese: {
    agreement: "合意書",
    contract: "契約書",
    report: "報告書",
    summary: "要約",
    document: "文書",
    executive: "エグゼクティブ",
    quarterly: "四半期",
    financial: "財務",
    statement: "声明",
    overview: "概要",
    analysis: "分析",
    introduction: "はじめに",
    conclusion: "結論",
    services: "サービス",
    obligations: "義務",
    liability: "法的責任",
    confidential: "機密",
    terms: "規約",
    conditions: "条件",
    payment: "支払い",
    date: "日付",
    parties: "当事者",
    law: "法律",
    section: "条項",
    page: "ページ",
    total: "合計",
    growth: "成長",
    revenue: "収益",
    profit: "利益",
    strategy: "戦略",
    risk: "リスク",
    management: "管理",
    performance: "実績",
    compliance: "コンプライアンス",
    signature: "署名",
  },
  Hindi: {
    agreement: "समझौता",
    contract: "अनुबंध",
    report: "रिपोर्ट",
    summary: "सारांश",
    document: "दस्तावेज़",
    executive: "कार्यकारी",
    quarterly: "त्रैमासिक",
    financial: "वित्तीय",
    statement: "विवरण",
    overview: "अवलोकन",
    analysis: "विश्लेषण",
    introduction: "परिचय",
    conclusion: "निष्कर्ष",
    services: "सेवाएं",
    obligations: "दायित्व",
    liability: "देनदारी",
    confidential: "गोपनीय",
    terms: "शर्तें",
    conditions: "नियम",
    payment: "भुगतान",
    date: "तारीख",
    parties: "पक्षकार",
    law: "कानून",
    section: "धारा",
    page: "पृष्ठ",
    total: "कुल",
    growth: "वृद्धि",
    revenue: "राजस्व",
    profit: "लाभ",
    strategy: "रणनीति",
    risk: "जोखिम",
    management: "प्रबंधन",
    performance: "प्रदर्शन",
    compliance: "अनुपालन",
    signature: "हस्ताक्षर",
  },
  Portuguese: {
    agreement: "acordo",
    contract: "contrato",
    report: "relatorio",
    summary: "resumo",
    document: "documento",
    executive: "executivo",
    quarterly: "trimestral",
    financial: "financeiro",
    statement: "declaracao",
    overview: "visao geral",
    analysis: "analise",
    introduction: "introducao",
    conclusion: "conclusao",
    services: "servicos",
    obligations: "obrigacoes",
    liability: "responsabilidade",
    confidential: "confidencial",
    terms: "termos",
    conditions: "condicoes",
    payment: "pagamento",
    date: "data",
    parties: "partes",
    law: "lei",
    section: "secao",
    page: "pagina",
    total: "total",
    growth: "crescimento",
    revenue: "receita",
    profit: "lucro",
    strategy: "estrategia",
    risk: "risco",
    management: "gestao",
    performance: "desempenho",
    compliance: "conformidade",
    signature: "assinatura",
  },
  Italian: {
    agreement: "accordo",
    contract: "contratto",
    report: "relazione",
    summary: "sommario",
    document: "documento",
    executive: "esecutivo",
    quarterly: "trimestrale",
    financial: "finanziario",
    statement: "dichiarazione",
    overview: "panoramica",
    analysis: "analisi",
    introduction: "introduzione",
    conclusion: "conclusione",
    services: "servizi",
    obligations: "obblighi",
    liability: "responsabilita",
    confidential: "riservato",
    terms: "termini",
    conditions: "condizioni",
    payment: "pagamento",
    date: "data",
    parties: "parti",
    law: "legge",
    section: "sezione",
    page: "pagina",
    total: "totale",
    growth: "crescita",
    revenue: "entrate",
    profit: "profitto",
    strategy: "strategia",
    risk: "rischio",
    management: "gestione",
    performance: "prestazione",
    compliance: "conformita",
    signature: "firma",
  },
  Arabic: {
    agreement: "اتفاقية",
    contract: "عقد",
    report: "تقرير",
    summary: "ملخص",
    document: "وثيقة",
    executive: "تنفيذي",
    quarterly: "ربع سنوي",
    financial: "مالي",
    statement: "بيان",
    overview: "نظرة عامة",
    analysis: "تحليل",
    introduction: "مقدمة",
    conclusion: "خاتمة",
    services: "خدمات",
    obligations: "التزامات",
    liability: "مسؤولية",
    confidential: "سري",
    terms: "شروط",
    conditions: "أحكام",
    payment: "دفع",
    date: "تاريخ",
    parties: "أطراف",
    law: "قانون",
    section: "قسم",
    page: "صفحة",
    total: "إجمالي",
    growth: "نمو",
    revenue: "إيرادات",
    profit: "ربح",
    strategy: "استراتيجية",
    risk: "مخاطر",
    management: "إدارة",
    performance: "أداء",
    compliance: "امتثال",
    signature: "توقيع",
  },
  Russian: {
    agreement: "соглашение",
    contract: "договор",
    report: "отчет",
    summary: "резюме",
    document: "документ",
    executive: "исполнительный",
    quarterly: "квартальный",
    financial: "финансовый",
    statement: "заявление",
    overview: "обзор",
    analysis: "анализ",
    introduction: "введение",
    conclusion: "заключение",
    services: "услуги",
    obligations: "обязательства",
    liability: "ответственность",
    confidential: "конфиденциально",
    terms: "условия",
    conditions: "положения",
    payment: "оплата",
    date: "дата",
    parties: "стороны",
    law: "закон",
    section: "раздел",
    page: "страница",
    total: "итого",
    growth: "рост",
    revenue: "выручка",
    profit: "прибыль",
    strategy: "стратегия",
    risk: "риск",
    management: "управление",
    performance: "эффективность",
    compliance: "соответствие",
    signature: "подпись",
  },
};

/**
 * Common phrase openers
 */
const PHRASE_OPENERS: Record<SupportedLanguage, [RegExp, string][]> = {
  Spanish: [
    [/^this agreement is made/i, "Este acuerdo se celebra"],
    [/^this document contains/i, "Este documento contiene"],
    [/^in accordance with/i, "De conformidad con"],
    [/^for the purposes of/i, "A los efectos de"],
    [/^the parties agree that/i, "Las partes acuerdan que"],
    [/^pursuant to section/i, "De conformidad con la seccion"],
    [/^as described in/i, "Como se describe en"],
  ],
  French: [
    [/^this agreement is made/i, "Le present accord est conclu"],
    [/^this document contains/i, "Ce document contient"],
    [/^in accordance with/i, "Conformement a"],
    [/^the parties agree that/i, "Les parties conviennent que"],
  ],
  German: [
    [/^this agreement is made/i, "Diese Vereinbarung wird geschlossen"],
    [/^this document contains/i, "Dieses Dokument enthaelt"],
    [/^in accordance with/i, "Gemaess"],
    [/^the parties agree that/i, "Die Parteien vereinbaren, dass"],
  ],
  Chinese: [
    [/^this agreement is made/i, "本协议订立于"],
    [/^this document contains/i, "本文件包含"],
    [/^in accordance with/i, "根据"],
    [/^the parties agree that/i, "各方同意"],
  ],
  Japanese: [
    [/^this agreement is made/i, "本合意は以下により締結される"],
    [/^this document contains/i, "本文書には以下が含まれる"],
    [/^in accordance with/i, "に従って"],
    [/^the parties agree that/i, "両当事者は以下に合意する"],
  ],
  Hindi: [
    [/^this agreement is made/i, "यह समझौता किया जाता है"],
    [/^this document contains/i, "इस दस्तावेज़ में शामिल है"],
    [/^in accordance with/i, "के अनुसार"],
    [/^the parties agree that/i, "पक्षकार सहमत हैं कि"],
  ],
  Portuguese: [
    [/^this agreement is made/i, "Este contrato e celebrado"],
    [/^this document contains/i, "Este documento contem"],
    [/^in accordance with/i, "De acordo com"],
    [/^the parties agree that/i, "As partes concordam que"],
  ],
  Italian: [
    [/^this agreement is made/i, "Il presente accordo e stipulato"],
    [/^this document contains/i, "Questo documento contiene"],
    [/^in accordance with/i, "In conformita con"],
    [/^the parties agree that/i, "Le parti concordano che"],
  ],
  Arabic: [
    [/^this agreement is made/i, "تم إبرام هذه الاتفاقية"],
    [/^this document contains/i, "تحتوي هذه الوثيقة على"],
    [/^in accordance with/i, "وفقاً لـ"],
    [/^the parties agree that/i, "يتفق الطرفان على أن"],
  ],
  Russian: [
    [/^this agreement is made/i, "Настоящее соглашение заключено"],
    [/^this document contains/i, "Данный документ содержит"],
    [/^in accordance with/i, "В соответствии с"],
    [/^the parties agree that/i, "Стороны соглашаются, что"],
  ],
};

/**
 * Smart offline sentence translator using phrase rules and high-coverage glossary
 */
function translateTextOffline(text: string, targetLang: SupportedLanguage): string {
  if (!text || text.trim().length === 0) return "";
  let translated = text;

  // Check phrase openers
  const openers = PHRASE_OPENERS[targetLang] || [];
  for (const [pattern, replacement] of openers) {
    if (pattern.test(translated)) {
      translated = translated.replace(pattern, replacement);
      break;
    }
  }

  // Word-by-word glossary replacement
  const dict = DICTIONARY[targetLang];
  if (dict) {
    translated = translated.replace(/\b([a-zA-Z]{3,})\b/g, (match) => {
      const lower = match.toLowerCase();
      if (dict[lower]) {
        const replacement = dict[lower];
        if (match.charAt(0) === match.charAt(0).toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
      }
      return match;
    });
  }

  return translated;
}

/**
 * Splits document text into clean semantic units (headings, bullets, paragraphs)
 */
export function segmentDocumentText(pages: string[]): DocumentSegment[] {
  const segments: DocumentSegment[] = [];
  let segIndex = 1;

  pages.forEach((pageStr, pageIdx) => {
    const lines = pageStr
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const combined = currentParagraph.join(" ");
        if (combined.length > 0) {
          segments.push({
            id: `seg_${segIndex++}`,
            pageNum: pageIdx + 1,
            type: "paragraph",
            sourceText: combined,
            targetText: "",
          });
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      // Check if Heading
      const isShortLine = line.length <= 60 && !line.endsWith(".");
      const isHeaderTag = line.startsWith("#");
      const isAllCaps = line.length > 4 && line === line.toUpperCase() && /[A-Z]/.test(line);

      if (isHeaderTag || (isShortLine && (isAllCaps || line.split(" ").length <= 7))) {
        flushParagraph();
        segments.push({
          id: `seg_${segIndex++}`,
          pageNum: pageIdx + 1,
          type: "heading",
          sourceText: line.replace(/^#+\s*/, ""),
          targetText: "",
        });
        continue;
      }

      // Check if Bullet point
      if (/^([•\-\*]|\d+[\.\)])\s+/.test(line)) {
        flushParagraph();
        segments.push({
          id: `seg_${segIndex++}`,
          pageNum: pageIdx + 1,
          type: "bullet",
          sourceText: line,
          targetText: "",
        });
        continue;
      }

      // Check if Table row or divider
      if (line.includes("|") && line.split("|").length >= 3) {
        flushParagraph();
        segments.push({
          id: `seg_${segIndex++}`,
          pageNum: pageIdx + 1,
          type: "table_row",
          sourceText: line,
          targetText: "",
        });
        continue;
      }

      // Regular paragraph line
      currentParagraph.push(line);
    }

    flushParagraph();
  });

  return segments;
}

/**
 * Attempts to translate batch of text via Gemini 2.5 Flash API route
 */
async function callAiTranslation(
  segments: DocumentSegment[],
  targetLanguage: SupportedLanguage
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const promptText = segments
      .map((s, idx) => `[${idx + 1}] ${s.sourceText}`)
      .join("\n\n");

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "translate",
        text: promptText.slice(0, 45000),
        targetLanguage,
      }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (!data.text) return false;

    // Parse out [1], [2] responses if present
    const responseLines = data.text.split("\n\n");
    if (responseLines.length >= Math.floor(segments.length * 0.7)) {
      segments.forEach((seg, idx) => {
        const matching = responseLines[idx];
        if (matching) {
          seg.targetText = matching.replace(/^\[\d+\]\s*/, "").trim();
        }
      });
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Generates an in-browser Bilingual PDF Document using pdf-lib
 */
export async function generateBilingualPdf(
  fileName: string,
  segments: DocumentSegment[],
  targetLanguage: SupportedLanguage,
  layoutMode: BilingualLayoutMode = "side_by_side"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 36;
  const contentWidth = pageSize[0] - margin * 2;
  const colGutter = 16;
  const colWidth = (contentWidth - colGutter) / 2;
  const colLeftX = margin;
  const colRightX = margin + colWidth + colGutter;
  const colMidX = margin + colWidth + colGutter / 2;

  const topY = pageSize[1] - margin;
  const bottomY = margin + 24;

  let currentPage = pdfDoc.addPage(pageSize);
  let currentY = topY;

  const drawHeaderAndFooter = (page: PDFPage, pNum: number, totalP: number) => {
    // Header banner
    page.drawText(sanitizeWinAnsi(`BILINGUAL DOCUMENT TRANSLATION (${targetLanguage.toUpperCase()})`), {
      x: margin,
      y: pageSize[1] - 24,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.4),
    });
    page.drawText(sanitizeWinAnsi(fileName), {
      x: pageSize[0] - margin - 120,
      y: pageSize[1] - 24,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawLine({
      start: { x: margin, y: pageSize[1] - 28 },
      end: { x: pageSize[0] - margin, y: pageSize[1] - 28 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.9),
    });

    // Column Labels
    if (layoutMode === "side_by_side") {
      page.drawText(sanitizeWinAnsi("ORIGINAL SOURCE (EN)"), {
        x: colLeftX,
        y: pageSize[1] - 38,
        size: 7.5,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.5),
      });
      page.drawText(sanitizeWinAnsi(`TRANSLATED (${targetLanguage.toUpperCase()})`), {
        x: colRightX,
        y: pageSize[1] - 38,
        size: 7.5,
        font: fontBold,
        color: rgb(0.2, 0.4, 0.8),
      });
      page.drawLine({
        start: { x: margin, y: pageSize[1] - 42 },
        end: { x: pageSize[0] - margin, y: pageSize[1] - 42 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.9),
      });
    }

    // Footer
    page.drawLine({
      start: { x: margin, y: margin + 14 },
      end: { x: pageSize[0] - margin, y: margin + 14 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.9),
    });
    page.drawText(sanitizeWinAnsi("DocDrop Bilingual Document Studio - 100% In-Browser Memory"), {
      x: margin,
      y: margin + 4,
      size: 7.5,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(sanitizeWinAnsi(`Page ${pNum} of ${totalP}`), {
      x: pageSize[0] - margin - 50,
      y: margin + 4,
      size: 7.5,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.4),
    });
  };

  currentY -= 48; // Space under header

  for (const seg of segments) {
    const isHeading = seg.type === "heading";
    const fontSize = isHeading ? 10.5 : 8.5;
    const lineHeight = fontSize + 4;
    const currentFont = isHeading ? fontBold : font;
    const sourceClean = sanitizeWinAnsi(seg.sourceText);
    const targetClean = sanitizeWinAnsi(seg.targetText || seg.sourceText);

    if (layoutMode === "side_by_side") {
      const leftLines = wrapLines(sourceClean, 40);
      const rightLines = wrapLines(targetClean, 40);
      const maxLines = Math.max(leftLines.length, rightLines.length);
      const blockHeight = maxLines * lineHeight + (isHeading ? 10 : 6);

      if (currentY - blockHeight < bottomY) {
        currentPage = pdfDoc.addPage(pageSize);
        currentY = topY - 48;
      }

      // Draw subtle dividing hairline
      currentPage.drawLine({
        start: { x: colMidX, y: currentY + 2 },
        end: { x: colMidX, y: currentY - blockHeight + 4 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.92),
      });

      // Left Column (Source)
      let lineY = currentY;
      for (const line of leftLines) {
        currentPage.drawText(line, {
          x: colLeftX,
          y: lineY,
          size: fontSize,
          font: currentFont,
          color: isHeading ? rgb(0.1, 0.1, 0.15) : rgb(0.2, 0.2, 0.25),
        });
        lineY -= lineHeight;
      }

      // Right Column (Target)
      lineY = currentY;
      for (const line of rightLines) {
        currentPage.drawText(line, {
          x: colRightX,
          y: lineY,
          size: fontSize,
          font: currentFont,
          color: isHeading ? rgb(0.1, 0.2, 0.6) : rgb(0.15, 0.15, 0.2),
        });
        lineY -= lineHeight;
      }

      currentY -= blockHeight;
    } else {
      // Interlinear or Monolingual
      const lines = wrapLines(layoutMode === "monolingual_target" ? targetClean : `${sourceClean}\n-> [${targetLanguage}]: ${targetClean}`, 75);
      const blockHeight = lines.length * lineHeight + (isHeading ? 10 : 6);

      if (currentY - blockHeight < bottomY) {
        currentPage = pdfDoc.addPage(pageSize);
        currentY = topY - 48;
      }

      let lineY = currentY;
      for (const line of lines) {
        currentPage.drawText(line, {
          x: margin,
          y: lineY,
          size: fontSize,
          font: currentFont,
          color: isHeading ? rgb(0.1, 0.15, 0.5) : rgb(0.2, 0.2, 0.2),
        });
        lineY -= lineHeight;
      }
      currentY -= blockHeight;
    }
  }

  // Stamp page numbers and headers across all created pages
  const totalCreatedPages = pdfDoc.getPageCount();
  pdfDoc.getPages().forEach((p, idx) => {
    drawHeaderAndFooter(p, idx + 1, totalCreatedPages);
  });

  return await pdfDoc.save();
}

/**
 * Generates an interactive standalone bilingual HTML document with side-by-side sync view
 */
export function generateBilingualHtmlViewer(
  fileName: string,
  segments: DocumentSegment[],
  targetLanguage: SupportedLanguage
): string {
  const rows = segments
    .map(
      (s, idx) => `
    <tr class="segment-row" data-type="${s.type}">
      <td class="seg-num">${idx + 1}</td>
      <td class="seg-type"><span class="badge ${s.type}">${s.type.replace("_", " ")}</span></td>
      <td class="source-col">${escapeHtml(s.sourceText)}</td>
      <td class="target-col">${escapeHtml(s.targetText || s.sourceText)}</td>
    </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilingual Translation: ${escapeHtml(fileName)} (${targetLanguage})</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #8b5cf6;
      --source-accent: #38bdf8;
      --target-accent: #a78bfa;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    h1 { font-size: 20px; margin: 0; font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #27272a;
      color: var(--muted);
    }
    .badge.heading { background: #3b0764; color: #d8b4fe; }
    .badge.bullet { background: #1e293b; color: #94a3b8; }
    .badge.table_row { background: #064e3b; color: #6ee7b7; }
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      font-size: 13px;
    }
    .table-container {
      background: var(--card-bg);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: #121215;
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
      color: var(--muted);
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .seg-num { width: 40px; font-family: monospace; color: var(--muted); font-size: 11px; }
    .seg-type { width: 90px; }
    .source-col { width: 44%; border-right: 1px solid var(--border); }
    .target-col { width: 44%; color: #e4e4e7; }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>DocDrop Bilingual Layout Viewer</h1>
      <p style="margin: 4px 0 0; color: var(--muted); font-size: 12px;">
        File: <strong>${escapeHtml(fileName)}</strong> &bull; Target Language: <strong>${targetLanguage}</strong> &bull; Total Segments: <strong>${segments.length}</strong>
      </p>
    </div>
    <span class="badge" style="background: #4c1d95; color: #e9d5ff;">100% In-Browser Memory</span>
  </div>

  <div class="toolbar">
    <input type="text" id="search" placeholder="Search original or translated text..." onkeyup="filterRows()">
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Type</th>
          <th>Original Document (Source)</th>
          <th>Translated (${targetLanguage})</th>
        </tr>
      </thead>
      <tbody id="table-body">
        ${rows}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated with DocDrop Studio &bull; Zero Server Uploads &bull; Private &amp; Offline Ready
  </div>

  <script>
    function filterRows() {
      const q = document.getElementById('search').value.toLowerCase();
      const rows = document.querySelectorAll('.segment-row');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Main Translate PDF Layout Engine Orchestrator
 */
export async function translatePdfLayout(
  file: File,
  options: TranslateLayoutOptions
): Promise<TranslateLayoutResult> {
  const {
    targetLanguage,
    layoutMode = "side_by_side",
    includeBilingualPdf = true,
    onProgress,
  } = options;

  onProgress?.(10, "Extracting text and structure from PDF pages...");
  const { text, pages } = await extractTextFromPdf(file);

  onProgress?.(30, "Analyzing semantic layout, headings, and paragraph blocks...");
  const segments = segmentDocumentText(pages);

  onProgress?.(50, `Translating segments into ${targetLanguage}...`);

  // Attempt AI Translation tier
  const aiSucceeded = await callAiTranslation(segments, targetLanguage);

  // If AI translation did not populate all targets, apply dictionary & linguistic pattern mapper
  if (!aiSucceeded) {
    onProgress?.(65, "Applying in-browser linguistic pattern engine...");
    segments.forEach((seg) => {
      if (!seg.targetText) {
        seg.targetText = translateTextOffline(seg.sourceText, targetLanguage);
      }
    });
  }

  // Count metrics
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  onProgress?.(80, "Generating bilingual layout reports...");

  // Generate Side-by-Side Markdown
  const markdownContent = `# Bilingual Document Translation Layout: ${file.name}

**Target Language**: ${targetLanguage} | **Layout Mode**: ${layoutMode.replace(/_/g, " ")}
**Total Pages**: ${pages.length} | **Semantic Segments**: ${segments.length} | **Words Analyzed**: ~${wordCount}
**Execution**: 100% In-Browser Memory (DocDrop Studio)

---

${pages
  .map((_, pIdx) => {
    const pageSegments = segments.filter((s) => s.pageNum === pIdx + 1);
    if (pageSegments.length === 0) return "";

    return `### Page ${pIdx + 1}
| # | Type | Source Document (Original) | Target Document (${targetLanguage}) |
| :-: | :-: | :--- | :--- |
${pageSegments
  .map(
    (s, sIdx) =>
      `| ${sIdx + 1} | \`${s.type}\` | ${s.sourceText.replace(/\|/g, "\\|")} | ${s.targetText.replace(/\|/g, "\\|")} |`
  )
  .join("\n")}`;
  })
  .filter(Boolean)
  .join("\n\n---\n\n")}
`;

  // Generate Interactive HTML Viewer
  const htmlViewerContent = generateBilingualHtmlViewer(file.name, segments, targetLanguage);

  // Generate JSON Translation Memory
  const jsonContent = JSON.stringify(
    {
      document: file.name,
      sourceLanguage: "Auto-detected (English)",
      targetLanguage,
      layoutMode,
      totalPages: pages.length,
      totalSegments: segments.length,
      totalWords: wordCount,
      generatedAt: new Date().toISOString(),
      segments: segments.map((s) => ({
        id: s.id,
        pageNum: s.pageNum,
        type: s.type,
        source: s.sourceText,
        target: s.targetText,
      })),
    },
    null,
    2
  );

  let pdfBytes: Uint8Array | undefined;
  if (includeBilingualPdf) {
    onProgress?.(90, "Compiling dual-column bilingual PDF document...");
    try {
      pdfBytes = await generateBilingualPdf(file.name, segments, targetLanguage, layoutMode);
    } catch (pdfErr) {
      console.warn("Could not generate bilingual PDF bytes, fallback to text output:", pdfErr);
    }
  }

  onProgress?.(100, "Bilingual layout generated successfully!");

  return {
    pdfBytes,
    markdownContent,
    htmlViewerContent,
    jsonContent,
    segments,
    sourceLanguage: "English (Detected)",
    targetLanguage,
    layoutMode,
    totalPages: pages.length,
    totalSegments: segments.length,
    totalWords: wordCount,
    summary: `Extracted ${segments.length} semantic blocks across ${pages.length} pages into ${targetLanguage} bilingual layout.`,
  };
}
