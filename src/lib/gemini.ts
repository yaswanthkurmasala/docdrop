/**
 * Client helper for Google Gemini AI features in DocMark
 */

export interface GeminiAiResponse {
  success: boolean;
  text?: string;
  error?: string;
  model?: string;
}

export async function callGeminiAi(params: {
  task: "summarize" | "translate" | "ocr" | "enhance-markdown" | "chat";
  text?: string;
  targetLanguage?: string;
  imageBase64?: string;
  mimeType?: string;
  prompt?: string;
  question?: string;
}): Promise<GeminiAiResponse> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `AI Request failed with status ${res.status}`);
    }

    return {
      success: true,
      text: data.text,
      model: data.model || "gemini-2.5-flash",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to communicate with Gemini AI",
    };
  }
}
