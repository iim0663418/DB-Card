// Shared OCR helpers used by unified-extract and extract-draft

/**
 * Convert ArrayBuffer to Base64 in chunks to avoid stack overflow on large images
 */
export function arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binaryString = '';

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode(...chunk);
  }

  return btoa(binaryString);
}

/**
 * Retry with exponential backoff and jitter.
 * Retries on QUOTA_OR_LIMIT (429) and SERVICE_UNAVAILABLE (503) errors.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const shouldRetry = msg.includes('QUOTA_OR_LIMIT') || msg.includes('SERVICE_UNAVAILABLE');

      if (!shouldRetry || i === maxRetries - 1) throw error;

      const baseDelay = Math.pow(2, i) * 1000;
      const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
    }
  }
  throw new Error('Retry exhausted');
}

/**
 * 3-stage JSON parser: direct → markdown strip → brace balancing
 */
export function parseGeminiJSON(text: string): unknown {
  let jsonString = text.trim();

  // Stage 1: Remove markdown code blocks
  const fencedMatch = jsonString.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```/);
  if (fencedMatch) {
    jsonString = fencedMatch[1].trim();
  }

  // Stage 2: Fix common AI output issues
  jsonString = jsonString.replace(/([^\\])(\\n|\\t|\\r)/g, '$1\\\\$2');
  jsonString = jsonString.replace(/\\'/g, "'");
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

  // Stage 3: Brace balancing
  const firstBraceIndex = jsonString.indexOf('{');
  if (firstBraceIndex !== -1) {
    let braceDepth = 0;
    let inString = false;
    let stringQuote = '';
    let isEscaped = false;
    let endIndex = firstBraceIndex;

    for (; endIndex < jsonString.length; endIndex++) {
      const ch = jsonString[endIndex];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (ch === '\\') {
          isEscaped = true;
        } else if (ch === stringQuote) {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringQuote = ch;
        } else if (ch === '{') {
          braceDepth++;
        } else if (ch === '}') {
          braceDepth--;
          if (braceDepth === 0) { endIndex++; break; }
        }
      }
    }

    jsonString = jsonString.slice(firstBraceIndex, endIndex).trim();
    if (inString) jsonString += stringQuote;
    while (braceDepth > 0) { jsonString += '}'; braceDepth--; }
  }

  return JSON.parse(jsonString);
}
