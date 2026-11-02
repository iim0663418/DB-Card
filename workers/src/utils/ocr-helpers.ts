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

export interface RetryOptions {
  /** Absolute deadline (Date.now() basis). Give up when another full attempt cannot fit. */
  deadline?: number;
  /** Per-attempt time budget, used for the deadline check. */
  callBudgetMs?: number;
}

/**
 * Retry with exponential backoff and jitter.
 * Retries only transient upstream errors: QUOTA_OR_LIMIT, SERVICE_UNAVAILABLE,
 * GEMINI_HTTP_429/502/503. 500/504 are NOT retried: they usually mean the request itself is
 * too heavy or the upstream already waited a long time, so a retry multiplies the slowest path.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  opts: RetryOptions = {}
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const shouldRetry = msg.includes('QUOTA_OR_LIMIT') || msg.includes('SERVICE_UNAVAILABLE')
        || /^GEMINI_HTTP_(429|502|503)\b/.test(msg);

      // 不可重試的錯誤：直接拋出，不消耗 retry budget
      const isNonRetryable = msg.includes('FAILED_PRECONDITION') || msg.includes('SERVICE_PRECONDITION')
        || msg.startsWith('GEMINI_TIMEOUT');
      if (isNonRetryable || !shouldRetry || i === maxRetries - 1) throw error;

      const baseDelay = Math.pow(2, i) * 1000;
      const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
      const delay = baseDelay + jitter;

      // Check the budget BEFORE sleeping: do not wait out the backoff only to find no time left.
      if (opts.deadline !== undefined && Date.now() + delay + (opts.callBudgetMs ?? 0) > opts.deadline) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
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

  // Fast path: valid JSON must be parsed untouched. Stage 2 below rewrites escape sequences
  // and would corrupt legitimate "\\n" sequences inside strings.
  try {
    return JSON.parse(jsonString);
  } catch { /* fall through to repair stages */ }

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

/**
 * Reads Gemini HTTP error response body once and throws a classified error.
 * The upstream body is NEVER placed in the Error message: messages flow into
 * temp_uploads.ocr_error and user-facing responses, and a body can echo request content.
 * - 412 FAILED_PRECONDITION: throws 'FAILED_PRECONDITION: <upstreamStatus>'
 * - Other: throws 'GEMINI_HTTP_<status>: <upstreamStatus>'
 */
export async function throwGeminiHttpError(res: Response, label: string): Promise<never> {
  const body = await res.text();
  let upstreamStatus = 'UNKNOWN';
  try { upstreamStatus = String((JSON.parse(body) as any)?.error?.status ?? 'UNKNOWN'); } catch { /* non-JSON body */ }
  console.error(`[${label}] Gemini HTTP ${res.status}`, JSON.stringify({ upstreamStatus }));
  if (res.status === 412) {
    throw new Error(`FAILED_PRECONDITION: ${upstreamStatus}`);
  }
  throw new Error(`GEMINI_HTTP_${res.status}: ${upstreamStatus}`);
}

export interface MappedGeminiError {
  errorCode: string;
  statusCode: number;
  userMessage: string;
}

/**
 * Map an extraction error message to a stable error code, HTTP status and user-safe message.
 * Shared by unified-extract and extract-draft. Messages produced by throwGeminiHttpError
 * contain no upstream body, so falling back to the message itself is safe.
 */
export function mapGeminiError(message: string): MappedGeminiError {
  if (message.startsWith('FAILED_PRECONDITION:')) {
    return { errorCode: 'SERVICE_PRECONDITION', statusCode: 503, userMessage: '服務設定異常，請聯繫管理者 / Service configuration error, please contact support' };
  }
  if (message.startsWith('SAFETY_FILTER:')) {
    return { errorCode: 'SAFETY_FILTER', statusCode: 422, userMessage: '圖片內容被安全過濾器阻擋 / Image content blocked by safety filters' };
  }
  if (message.startsWith('QUOTA_OR_LIMIT:')) {
    return { errorCode: 'QUOTA_EXCEEDED', statusCode: 429, userMessage: 'API 配額已達上限或圖片解析度異常，請稍後再試 / API quota exceeded or image resolution issue. Please try again later.' };
  }
  if (message.startsWith('UNKNOWN_BLOCK:')) {
    return { errorCode: 'CONTENT_BLOCKED', statusCode: 422, userMessage: '圖片無法處理，原因未知 / Image cannot be processed due to unknown reason' };
  }
  if (/^GEMINI_HTTP_402\b/.test(message)) {
    return { errorCode: 'SERVICE_BILLING', statusCode: 503, userMessage: 'AI 服務額度已用盡，請聯繫管理者 / AI service credits depleted, please contact support' };
  }
  if (/^GEMINI_HTTP_429\b/.test(message)) {
    return { errorCode: 'QUOTA_EXCEEDED', statusCode: 429, userMessage: 'API 配額已達上限，請稍後再試 / API quota exceeded. Please try again later.' };
  }
  if (/^GEMINI_TIMEOUT\b/.test(message)) {
    return { errorCode: 'UPSTREAM_TIMEOUT', statusCode: 504, userMessage: 'AI 服務回應逾時，請稍後再試 / AI service timed out. Please try again.' };
  }
  if (/^GEMINI_HTTP_(500|502|503|504)\b/.test(message)) {
    return { errorCode: 'UPSTREAM_UNAVAILABLE', statusCode: 503, userMessage: 'AI 服務暫時無法使用，請稍後再試 / AI service temporarily unavailable. Please try again later.' };
  }
  if (message.startsWith('Response truncated')) {
    return { errorCode: 'RESPONSE_TRUNCATED', statusCode: 500, userMessage: '回應內容過長被截斷，請重試 / Response was truncated. Please try again.' };
  }
  if (/^GEMINI_HTTP_\d+/.test(message)) {
    return { errorCode: 'UPSTREAM_ERROR', statusCode: 502, userMessage: 'AI 服務回應異常，請稍後再試 / AI service returned an error. Please try again later.' };
  }
  return { errorCode: 'EXTRACT_FAILED', statusCode: 500, userMessage: message };
}
