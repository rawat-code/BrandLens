import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runBatchedIntentCheck,
  enrichFindingsWithSuggestionsAndIntent,
} from '@/lib/review/suggest';
import type { Finding } from '@/lib/types';
import * as geminiModule from '@/lib/ai/gemini';

vi.mock('@/lib/ai/gemini', () => ({
  callGeminiJson: vi.fn(),
}));

describe('Suggestion & Batched Intent Check (suggest.ts)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('runs batched intent check and maps preserved/changed verdicts onto items', async () => {
    vi.mocked(geminiModule.callGeminiJson).mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'item-1',
            verdict: 'preserved',
            note: 'Suggestion maintains soothing hydration benefit without medical claim.',
          },
          {
            id: 'item-2',
            verdict: 'changed',
            note: 'Suggestion alters product category from cleanser to toner.',
          },
        ],
      },
      model: 'test-model',
      rawText: '',
    });

    const items = [
      { id: 'item-1', original: 'Cures severe dry skin', suggestion: 'Visibly supports skin barrier' },
      { id: 'item-2', original: 'Deep cleansing oil', suggestion: 'Balancing botanical toner' },
    ];

    const results = await runBatchedIntentCheck(items);

    expect(results.get('item-1')?.verdict).toBe('preserved');
    expect(results.get('item-2')?.verdict).toBe('changed');
  });

  it('enriches findings with intent verdicts in a single batch', async () => {
    vi.mocked(geminiModule.callGeminiJson).mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'f-0',
            verdict: 'preserved',
            note: 'Accurately maintains brand voice.',
          },
        ],
      },
      model: 'test-model',
      rawText: '',
    });

    const findings: Omit<Finding, 'id' | 'created_at'>[] = [
      {
        content_id: 'c-1',
        version: 1,
        rule_key: 'term.banned',
        origin: 'rule',
        category: 'terminology',
        severity: 'high',
        confidence: 1.0,
        excerpt: 'miracle cure',
        start_idx: 0,
        end_idx: 12,
        reason: 'banned term',
        source_type: 'term',
        source_id: 't-1',
        source_quote: 'cure',
        suggestion: 'effective botanical care',
        intent_check: null,
        intent_note: null,
        needs_human_check: false,
        requires_reviewer: true,
        status: 'open',
        dispute_reason: null,
      },
    ];

    const enriched = await enrichFindingsWithSuggestionsAndIntent(findings);

    expect(enriched[0].intent_check).toBe('preserved');
    expect(enriched[0].intent_note).toContain('Accurately maintains brand voice');
  });

  it('skips AI when skipAi option is passed', async () => {
    const findings: Omit<Finding, 'id' | 'created_at'>[] = [
      {
        content_id: 'c-1',
        version: 1,
        rule_key: 'term.banned',
        origin: 'rule',
        category: 'terminology',
        severity: 'high',
        confidence: 1.0,
        excerpt: 'cure',
        start_idx: 0,
        end_idx: 4,
        reason: 'banned term',
        source_type: 'term',
        source_id: 't-1',
        source_quote: 'cure',
        suggestion: 'support',
        intent_check: null,
        intent_note: null,
        needs_human_check: false,
        requires_reviewer: true,
        status: 'open',
        dispute_reason: null,
      },
    ];

    const result = await enrichFindingsWithSuggestionsAndIntent(findings, { skipAi: true });
    expect(result).toEqual(findings);
    expect(geminiModule.callGeminiJson).not.toHaveBeenCalled();
  });
});
