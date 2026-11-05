import { GoogleGenAI } from '@google/genai';

export interface GeminiOptions {
  systemInstruction?: string;
  timeoutMs?: number;
  model?: string;
  fallbackModel?: string;
}

export interface GeminiResponse<T = unknown> {
  data: T;
  model: string;
  rawText: string;
}

function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    text = text.slice(3);
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function callGeminiJson<T = unknown>(
  prompt: string,
  options?: GeminiOptions
): Promise<GeminiResponse<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const primaryModel = options?.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const fallbackModel =
    options?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';
  const timeoutMs = options?.timeoutMs ?? 20000;

  const ai = new GoogleGenAI({ apiKey });

  const attemptCall = async (modelName: string): Promise<GeminiResponse<T>> => {
    const apiCall = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: options?.systemInstruction,
      },
    });

    const response = await executeWithTimeout(
      apiCall,
      timeoutMs,
      `Gemini request timed out after ${timeoutMs}ms for model ${modelName}`
    );

    const rawText = response.text || '';
    const cleaned = cleanJsonText(rawText);
    const data = JSON.parse(cleaned) as T;

    return {
      data,
      model: modelName,
      rawText,
    };
  };

  // Attempt 1: primary model
  try {
    return await attemptCall(primaryModel);
  } catch (primaryError) {
    // Attempt 2 (one retry): fallback model if different, or retry primary
    const retryModel = fallbackModel && fallbackModel !== primaryModel ? fallbackModel : primaryModel;
    try {
      return await attemptCall(retryModel);
    } catch (fallbackError) {
      const errMessage =
        `Gemini API call failed on primary (${primaryModel}: ${(primaryError as Error).message}) ` +
        `and fallback (${retryModel}: ${(fallbackError as Error).message})`;
      throw new Error(errMessage);
    }
  }
}
