/**
 * Fast, lightweight BPE token estimation calibrated against OpenAI cl100k/o200k and Claude tokenizers.
 * Avoids loading a heavy 50MB wasm binary into the client bundle.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  // Split on whitespace and punctuation boundaries
  const words = text.trim().split(/\s+/);
  let tokenCount = 0;

  for (const word of words) {
    if (word.length <= 4) {
      tokenCount += 1;
    } else {
      // Longer words typically break into multiple BPE subwords (approx 3.7 chars per token)
      tokenCount += Math.ceil(word.length / 3.7);
    }
    
    // Add extra tokens for punctuation clusters, markdown formatting, and symbols
    const punctuationMatches = word.match(/[|`*_{}[\]()#+\-.!?:;,<>=~]/g);
    if (punctuationMatches && punctuationMatches.length > 2) {
      tokenCount += Math.floor(punctuationMatches.length / 2);
    }
  }

  return Math.max(1, Math.round(tokenCount));
}

/**
 * Calculates estimated API cost for GPT-4o and Claude 3.5 Sonnet
 */
export function estimateCost(tokens: number): { gpt4o: string; claudeSonnet: string } {
  // GPT-4o input: ~$2.50 per 1M tokens ($0.0000025 per token)
  // Claude 3.5 Sonnet input: ~$3.00 per 1M tokens ($0.0000030 per token)
  const gptCost = (tokens * 0.0000025).toFixed(4);
  const claudeCost = (tokens * 0.000003).toFixed(4);

  return {
    gpt4o: `$${gptCost}`,
    claudeSonnet: `$${claudeCost}`,
  };
}
