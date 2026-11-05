import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGeminiJson } from '../lib/ai/gemini';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('Gemini Wrapper (callGeminiJson)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'test-api-key',
      GEMINI_MODEL: 'test-primary-model',
      GEMINI_FALLBACK_MODEL: 'test-fallback-model',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error if GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(callGeminiJson('test prompt')).rejects.toThrow(
      'GEMINI_API_KEY environment variable is not set'
    );
  });

  it('returns parsed JSON data on successful response from primary model', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ status: 'ok', score: 95 }),
    });

    const result = await callGeminiJson<{ status: string; score: number }>('analyze this');

    expect(result.data).toEqual({ status: 'ok', score: 95 });
    expect(result.model).toBe('test-primary-model');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-primary-model',
        contents: 'analyze this',
      })
    );
  });

  it('strips markdown code fences from JSON output', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n{"verdict": "approved"}\n```',
    });

    const result = await callGeminiJson<{ verdict: string }>('check format');
    expect(result.data).toEqual({ verdict: 'approved' });
  });

  it('retries with fallback model when primary model fails', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        text: JSON.stringify({ fallbackSuccess: true }),
      });

    const result = await callGeminiJson<{ fallbackSuccess: boolean }>('check fallback');

    expect(result.data).toEqual({ fallbackSuccess: true });
    expect(result.model).toBe('test-fallback-model');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('throws when both primary and fallback attempts fail', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Primary error'))
      .mockRejectedValueOnce(new Error('Fallback error'));

    await expect(callGeminiJson('failing call')).rejects.toThrow(
      /Gemini API call failed on primary.*and fallback/
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('times out when call takes longer than timeoutMs', async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50))
    );

    await expect(
      callGeminiJson('timeout test', { timeoutMs: 10, fallbackModel: 'test-primary-model' })
    ).rejects.toThrow(/timed out/);
  });
});
