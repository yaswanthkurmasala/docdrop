export interface SampleDocument {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx";
  description: string;
  sampleContent: string;
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: "financial-report",
    name: "Q3_Financial_Summary.pdf",
    type: "pdf",
    description: "Financial earnings report with complex tables and balance sheets.",
    sampleContent: `# Apex Innovations Inc. — Q3 Financial Performance Report
**Period Ended:** September 30, 2026  
**Confidentiality:** Internal Corporate Review  

---

## Executive Summary
During the third quarter of fiscal year 2026, Apex Innovations recorded total consolidated revenue of **$142.8M**, reflecting a **24.5% year-over-year increase** driven primarily by Enterprise AI software subscriptions and cloud infrastructure expansion.

### Revenue Breakdown by Segment

| Business Segment | Q3 2025 ($M) | Q3 2026 ($M) | Growth (YoY) | Contribution (%) |
| :--- | :--- | :--- | :--- | :--- |
| Cloud AI Platform | 48.2 | 71.5 | +48.3% | 50.1% |
| Enterprise SaaS Suite | 38.6 | 44.2 | +14.5% | 30.9% |
| Professional Advisory | 18.0 | 17.6 | -2.2% | 12.3% |
| Developer Hardware Kits | 9.7 | 9.5 | -2.1% | 6.7% |
| **Total Consolidated** | **114.5** | **142.8** | **+24.5%** | **100.0%** |

---

## Operating Expenses & Margins
Gross margin expanded by **310 basis points** to **72.4%**, up from 69.3% in the prior year quarter, reflecting optimized cloud compute costs and automated deployment pipelines.

- **Research & Development:** $34.2M (23.9% of revenue)
- **Sales & Marketing:** $28.5M (19.9% of revenue)
- **General & Administrative:** $12.1M (8.5% of revenue)
- **Operating Income:** $28.6M (20.0% operating margin)

### Regional Distribution

| Region | Active Accounts | ARR ($M) | Net Retention Rate |
| :--- | :--- | :--- | :--- |
| North America | 4,280 | 88.4 | 118% |
| Europe & UK | 2,150 | 36.2 | 114% |
| Asia Pacific | 1,420 | 18.2 | 122% |
`,
  },
  {
    id: "ai-architecture",
    name: "LLM_RAG_Architecture_Doc.docx",
    type: "docx",
    description: "Technical architecture document with API schemas and code specifications.",
    sampleContent: `# Retrieval-Augmented Generation (RAG) Architecture Spec
**Author:** AI Platform Engineering  
**Version:** 2.4.0  
**Status:** Approved for Production  

---

## 1. System Overview
The Document Processing Gateway ingests unstructured documents (.pdf, .docx, .xlsx), parses them into semantically clean Markdown representations, and generates high-density embeddings stored in a vector index for sub-100ms retrieval.

### Architectural Pipeline
1. **Document Ingestion Layer:** Zero-knowledge client-side parser stripping noise, page numbers, and repetitive header banners.
2. **Semantic Chunker:** Splits parsed Markdown into 500-token chunks with 50-token contextual overlaps.
3. **Embedding Generation:** Vectors computed using 1536-dimensional embedding model.
4. **Hybrid Retrieval:** Dense vector cosine similarity combined with BM25 keyword search.

---

## 2. API Endpoint Specification

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| \`POST\` | \`/v1/documents/parse\` | Ingests document buffer, returns clean GFM Markdown | Yes (Bearer API Key) |
| \`POST\` | \`/v1/documents/chunk\` | Splits Markdown into token-bounded chunks | Yes |
| \`GET\` | \`/v1/documents/stats\` | Returns document token count and estimated LLM cost | No |

---

## 3. Recommended Prompt Injection Template
\`\`\`markdown
You are a senior analyst. Analyze the following document and answer the user query based ONLY on the provided context:

[DOCUMENT START]
{parsed_clean_markdown}
[DOCUMENT END]
\`\`\`
`,
  },
  {
    id: "product-catalog",
    name: "SaaS_Feature_Pricing_Matrix.xlsx",
    type: "xlsx",
    description: "Multi-column spreadsheet with feature comparison and subscription tiers.",
    sampleContent: `### Sheet: Pricing Tiers & Entitlements

| Plan Name | Monthly Price | Max Documents/Mo | Batch Processing | In-Browser OCR | Dedicated API |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Explorer** | $0.00 | 10 files | 1 file at a time | No | No |
| **Quick Pass** | $1.99 / 48h | Unlimited (48h) | Up to 25 files | Yes | No |
| **Pro Coffee** | $2.99 / month | Unlimited | Unlimited batch | Yes | Webhooks only |
| **Early Lifetime** | $24.00 (once) | Unlimited forever | Unlimited batch | Yes | Yes (10k req/mo) |

### Sheet: Performance Benchmarks

| Document Size | Parse Time (In-Browser) | Traditional Server Queue | Memory Footprint |
| :--- | :--- | :--- | :--- |
| 10-page PDF | 45 ms | 4,200 ms | 4.2 MB |
| 50-page DOCX | 82 ms | 7,100 ms | 6.8 MB |
| 1,000-row XLSX | 38 ms | 3,900 ms | 3.5 MB |
`,
  },
];
