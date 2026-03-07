import type { Env, ReceivedCardData } from '../types';

/**
 * Generates structured text for Vectorize embedding from a received card.
 *
 * Uses English field labels for universal compatibility, while preserving
 * the original language of field values (Chinese, Japanese, English, etc.).
 *
 * Example output:
 * ```
 * Name: 張三
 * Company: 台積電 (TSMC)
 * Title: Senior Engineer
 * Department: R&D
 * Company Summary: 全球最大半導體製造商
 * Personal Summary: 10年晶圓製程經驗
 * Contact: john@example.com, +886-2-1234-5678
 * Address: 台北市信義區信義路五段7號
 * Website: https://example.com
 * Note: 專精於先進製程技術
 * ```
 */
export function generateCardText(card: ReceivedCardData): string {
  const sections: string[] = [
    `Name: ${card.full_name}`,
  ];

  if (card.organization) {
    const orgLine = card.organization_en
      ? `Company: ${card.organization} (${card.organization_en})`
      : `Company: ${card.organization}`;
    sections.push(orgLine);
  }

  if (card.title)            sections.push(`Title: ${card.title}`);
  if (card.department)       sections.push(`Department: ${card.department}`);
  if (card.company_summary)  sections.push(`Company Summary: ${card.company_summary}`);
  if (card.personal_summary) sections.push(`Personal Summary: ${card.personal_summary}`);

  const contact = [card.email, card.phone].filter(Boolean).join(', ');
  if (contact) sections.push(`Contact: ${contact}`);

  if (card.address) sections.push(`Address: ${card.address}`);
  if (card.website) sections.push(`Website: ${card.website}`);
  if (card.note)    sections.push(`Note: ${card.note}`);

  return sections.join('\n');
}

/**
 * Calls the Gemini Embedding API to produce a 768-dim vector for `text`.
 *
 * @throws {Error} when the API returns a non-OK status.
 */
export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unable to read response');
    console.error('[Embedding API Error]', {
      status: response.status,
      statusText: response.statusText,
      errorBody,
      model: env.GEMINI_EMBEDDING_MODEL,
      inputTextLength: text.length,
      inputTextPreview: text.substring(0, 200),
    });
    throw new Error(`Embedding API failed: ${response.status}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

/**
 * Extracts location from card.address using Gemini Flash.
 *
 * Returns standardized city name (e.g., "台北", "Tokyo", "Singapore")
 * or undefined if no clear location is found.
 *
 * Uses structured output (JSON mode) for reliable parsing.
 */
export async function extractLocation(
  env: Env,
  card: ReceivedCardData
): Promise<string | undefined> {
  if (!card.address) return undefined;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `從以下地址提取城市名稱（中文或英文）：\n${card.address}\n\n若無法識別，回傳 null。`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                city: { type: ["string", "null"] }
              },
              required: ["city"]
            }
          }
        }),
        signal: AbortSignal.timeout(2000)
      }
    );

    if (!response.ok) return undefined;

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return undefined;

    const result = JSON.parse(text) as { city: string | null };
    return result.city || undefined;

  } catch (error) {
    console.error('[extractLocation] Failed:', error);
    return undefined;
  }
}

/**
 * Extracts industry from organization name using Gemini Flash.
 *
 * Returns standardized industry (e.g., "科技", "金融", "製造")
 * or undefined if unclear.
 */
export async function extractIndustry(
  env: Env,
  card: ReceivedCardData
): Promise<string | undefined> {
  if (!card.organization) return undefined;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `判斷以下公司的產業類別（科技/金融/製造/醫療/教育/零售/服務/其他）：\n${card.organization}\n${card.company_summary || ''}`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                industry: { type: ["string", "null"] }
              },
              required: ["industry"]
            }
          }
        }),
        signal: AbortSignal.timeout(2000)
      }
    );

    if (!response.ok) return undefined;

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return undefined;

    const result = JSON.parse(text) as { industry: string | null };
    return result.industry || undefined;

  } catch (error) {
    console.error('[extractIndustry] Failed:', error);
    return undefined;
  }
}
