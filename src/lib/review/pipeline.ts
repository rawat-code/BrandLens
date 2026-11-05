// src/lib/review/pipeline.ts
// Stub for review pipeline used by UI.
// TODO: replace with real implementation that calls Gemini AI.

export type Finding = Record<string, unknown>; // placeholder type, real schema is defined elsewhere.

/**
 * Runs the review process for a given content ID.
 * Currently returns an empty array so the UI can render without errors.
 *
 * @param _contentId - The ID of the content to review.
 * @returns A promise that resolves to an array of findings.
 */
export async function runReview(_contentId?: string): Promise<Finding[]> {
  void _contentId;
  return [];
}

