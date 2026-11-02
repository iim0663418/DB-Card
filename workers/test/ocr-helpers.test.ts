/**
 * Tests for Gemini error handling helpers (retry policy, error mapping, JSON parsing,
 * and PII-safe HTTP error classification).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  retryWithBackoff,
  mapGeminiError,
  parseGeminiJSON,
  throwGeminiHttpError,
} from '../src/utils/ocr-helpers';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('retryWithBackoff', () => {
  it('retries transient GEMINI_HTTP_503 and then succeeds', async () => {
    vi.useFakeTimers();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('GEMINI_HTTP_503: UNAVAILABLE'))
      .mockResolvedValueOnce('ok');
    const promise = retryWithBackoff(fn, 2);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it.each(['GEMINI_HTTP_500: INTERNAL', 'GEMINI_HTTP_504: DEADLINE_EXCEEDED', 'GEMINI_HTTP_402: RESOURCE_EXHAUSTED',
    'GEMINI_TIMEOUT: exceeded 90000ms', 'FAILED_PRECONDITION: x'])('does not retry %s', async (msg) => {
    const fn = vi.fn().mockRejectedValue(new Error(msg));
    await expect(retryWithBackoff(fn, 3)).rejects.toThrow(msg);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up before sleeping when the deadline cannot fit another attempt', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('GEMINI_HTTP_503: UNAVAILABLE'));
    const start = Date.now();
    await expect(
      retryWithBackoff(fn, 3, { deadline: start + 1000, callBudgetMs: 90_000 })
    ).rejects.toThrow('GEMINI_HTTP_503');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe('mapGeminiError', () => {
  it.each([
    ['GEMINI_HTTP_402: RESOURCE_EXHAUSTED', 'SERVICE_BILLING', 503],
    ['GEMINI_HTTP_429: RESOURCE_EXHAUSTED', 'QUOTA_EXCEEDED', 429],
    ['GEMINI_HTTP_500: INTERNAL', 'UPSTREAM_UNAVAILABLE', 503],
    ['GEMINI_HTTP_504: DEADLINE_EXCEEDED', 'UPSTREAM_UNAVAILABLE', 503],
    ['GEMINI_HTTP_400: INVALID_ARGUMENT', 'UPSTREAM_ERROR', 502],
    ['GEMINI_TIMEOUT: exceeded 90000ms', 'UPSTREAM_TIMEOUT', 504],
    ['FAILED_PRECONDITION: FAILED_PRECONDITION', 'SERVICE_PRECONDITION', 503],
    ['SAFETY_FILTER: blocked', 'SAFETY_FILTER', 422],
    ['Response truncated due to token limit. Please try again.', 'RESPONSE_TRUNCATED', 500],
    ['Invalid response format', 'EXTRACT_FAILED', 500],
  ])('maps %s', (message, errorCode, statusCode) => {
    const mapped = mapGeminiError(message);
    expect(mapped.errorCode).toBe(errorCode);
    expect(mapped.statusCode).toBe(statusCode);
  });

  it('does not expose a raw GEMINI_HTTP message to the user', () => {
    expect(mapGeminiError('GEMINI_HTTP_400: INVALID_ARGUMENT').userMessage).not.toContain('GEMINI_HTTP');
  });
});

describe('throwGeminiHttpError', () => {
  it('never places the upstream body in the Error message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const body = JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'echo: 王小明 02-1234-5678' } });
    const res = new Response(body, { status: 400 });
    await expect(throwGeminiHttpError(res, 'Test')).rejects.toThrow('GEMINI_HTTP_400: INVALID_ARGUMENT');
    const res2 = new Response(body, { status: 400 });
    try {
      await throwGeminiHttpError(res2, 'Test');
    } catch (e) {
      expect((e as Error).message).not.toContain('王小明');
    }
  });

  it('does not log the upstream body', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = new Response(JSON.stringify({ error: { status: 'X', message: 'secret-content' } }), { status: 500 });
    await expect(throwGeminiHttpError(res, 'Test')).rejects.toThrow();
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-content');
  });

  it('classifies 412 as FAILED_PRECONDITION', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = new Response(JSON.stringify({ error: { status: 'FAILED_PRECONDITION' } }), { status: 412 });
    await expect(throwGeminiHttpError(res, 'Test')).rejects.toThrow('FAILED_PRECONDITION: FAILED_PRECONDITION');
  });
});

describe('parseGeminiJSON', () => {
  it('preserves legitimate \\n escapes in valid JSON (fast path)', () => {
    const parsed = parseGeminiJSON('{"personal_summary":"第一句。\\n第二句。"}') as { personal_summary: string };
    expect(parsed.personal_summary).toBe('第一句。\n第二句。');
  });

  it('still repairs fenced JSON with trailing commas', () => {
    const parsed = parseGeminiJSON('```json\n{"a":1,}\n```') as { a: number };
    expect(parsed.a).toBe(1);
  });
});
