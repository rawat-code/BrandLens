import { describe, it, expect, vi, beforeEach } from 'vitest';
import { judgeContentWithAi } from '@/lib/review/judge';
import type { Finding, Fact, Term } from '@/lib/types';
import type { RetrievedChunk } from '@/lib/review/retrieve';
import * as geminiModule from '@/lib/ai/gemini';

vi.mock('@/lib/ai/gemini', () => ({
  callGeminiJson: vi.fn(),
}));

describe('AI Judge (judge.ts)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockChunks: RetrievedChunk[] = [
    {
      id: 'g-tone#p1',
      guidelineId: 'g-tone',
      title: 'Tone Guideline',
      text: 'Avoid aggressive pushy urgency in marketing copy.',
      score: 0.9,
    },
  ];

  const mockFacts: Fact[] = [
    {
      id: 'fact-1',
      org_id: 'org-1',
      statement: '92% improvement in skin barrier function.',
      status: 'approved',
    },
  ];

  const mockTerms: Term[] = [
    {
      id: 'term-1',
      org_id: 'org-1',
      term: 'cure',
      kind: 'banned',
    },
  ];

  it('validates and accepts grounded AI findings that match source material and unredacts excerpt', async () => {
    const originalText = 'Call user@example.com right now before stock runs out!';
    const redactedText = 'Call [EMAIL_1] right now before stock runs out!';
    const mappings = [{ placeholder: '[EMAIL_1]', original: 'user@example.com', type: 'email' as const }];

    vi.mocked(geminiModule.callGeminiJson).mockResolvedValueOnce({
      data: {
        findings: [
          {
            category: 'tone',
            severity: 'medium',
            confidence: 0.9,
            excerpt: '[EMAIL_1] right now before stock runs out',
            reason: 'Excessive urgency in marketing copy',
            source_type: 'guideline',
            source_id: 'g-tone#p1',
            source_quote: 'Avoid aggressive pushy urgency',
            suggestion: 'reach out to our friendly team',
          },
        ],
      },
      model: 'test-gemini-model',
      rawText: '',
    });

    const result = await judgeContentWithAi({
      contentId: 'c-1',
      version: 1,
      originalText,
      redactedText,
      mappings,
      retrievedChunks: mockChunks,
      facts: mockFacts,
      terms: mockTerms,
      ruleFindings: [],
    });

    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.excerpt).toBe('user@example.com right now before stock runs out');
    expect(f.source_type).toBe('guideline');
    expect(f.source_id).toBe('g-tone#p1');
    expect(f.needs_human_check).toBe(false);
  });

  it('falls back to needs_human_check=true, clears source, and caps high severity at medium if source verification fails', async () => {
    const originalText = 'Our gentle serum hydrates deeply.';

    vi.mocked(geminiModule.callGeminiJson).mockResolvedValueOnce({
      data: {
        findings: [
          {
            category: 'messaging',
            severity: 'high', // High severity should be capped at medium
            confidence: 0.8,
            excerpt: 'hydrates deeply',
            reason: 'Hallucinated brand guideline claim',
            source_type: 'guideline',
            source_id: 'non-existent-guideline-id',
            source_quote: 'invented quote not in source',
            suggestion: 'visibly nourishes',
          },
        ],
      },
      model: 'test-gemini-model',
      rawText: '',
    });

    const result = await judgeContentWithAi({
      contentId: 'c-1',
      version: 1,
      originalText,
      redactedText: originalText,
      mappings: [],
      retrievedChunks: mockChunks,
      facts: mockFacts,
      terms: mockTerms,
      ruleFindings: [],
    });

    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.needs_human_check).toBe(true);
    expect(f.source_id).toBeNull();
    expect(f.source_type).toBeNull();
    expect(f.severity).toBe('medium'); // Capped from high to medium
  });

  it('drops AI findings that duplicate existing rule findings in the same range and category', async () => {
    const originalText = 'This serum is guaranteed to cure severe eczema.';

    const ruleFindings: Omit<Finding, 'id' | 'created_at'>[] = [
      {
        content_id: 'c-1',
        version: 1,
        rule_key: 'claim.absolute',
        origin: 'rule',
        category: 'claim',
        severity: 'high',
        confidence: 1.0,
        excerpt: 'cure',
        start_idx: 27,
        end_idx: 31,
        reason: 'Rule-based banned claim',
        source_type: 'term',
        source_id: 'term-1',
        source_quote: 'cure',
        suggestion: null,
        intent_check: null,
        intent_note: null,
        needs_human_check: false,
        requires_reviewer: true,
        status: 'open',
        dispute_reason: null,
      },
    ];

    vi.mocked(geminiModule.callGeminiJson).mockResolvedValueOnce({
      data: {
        findings: [
          {
            category: 'claim', // Same category and overlapping range -> duplicate!
            severity: 'high',
            confidence: 0.95,
            excerpt: 'cure severe eczema',
            reason: 'Medical claim in cosmetics',
            source_type: 'term',
            source_id: 'term-1',
            source_quote: 'cure',
          },
        ],
      },
      model: 'test-gemini-model',
      rawText: '',
    });

    const result = await judgeContentWithAi({
      contentId: 'c-1',
      version: 1,
      originalText,
      redactedText: originalText,
      mappings: [],
      retrievedChunks: mockChunks,
      facts: mockFacts,
      terms: mockTerms,
      ruleFindings,
    });

    // Should be dropped as duplicate
    expect(result.findings).toHaveLength(0);
  });
});
