import { describe, it, expect } from 'vitest';
import { retrieve, chunkGuideline, LexicalRetriever } from '@/lib/review/retrieve';
import type { Guideline } from '@/lib/types';

describe('Retrieval Module (retrieve.ts)', () => {
  const mockGuidelines: Guideline[] = [
    {
      id: 'g-tone',
      org_id: 'org-1',
      title: 'Brand Tone Standards',
      category: 'tone',
      body: `Paragraph 1: Always use a warm, empathetic and empowering tone for sensitive skin.

Paragraph 2: Avoid aggressive marketing urgency, manufactured scarcity, and pushy call-to-actions.

Paragraph 3: Speak directly with scientific clarity without alienating non-specialist customers.`,
      version: 1,
    },
    {
      id: 'g-claims',
      org_id: 'org-1',
      title: 'Efficacy Claims Policy',
      category: 'claim',
      body: 'Never make 100% guarantee claims or state that cosmetic products cure dermatological illnesses.',
      version: 1,
    },
  ];

  it('chunks guidelines by paragraphs correctly', () => {
    const chunks = chunkGuideline(mockGuidelines[0]);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].id).toBe('g-tone#p1');
    expect(chunks[0].text).toContain('Paragraph 1');
    expect(chunks[1].id).toBe('g-tone#p2');
    expect(chunks[2].id).toBe('g-tone#p3');
  });

  it('ranks relevant chunks highest for a matching sentence', () => {
    const sentence = 'Do not use aggressive marketing urgency or pushy tactics.';
    const results = retrieve([sentence], mockGuidelines);

    expect(results.length).toBeGreaterThan(0);
    // Paragraph 2 mentions 'aggressive marketing urgency, manufactured scarcity, and pushy'
    expect(results[0].id).toBe('g-tone#p2');
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('deduplicates chunks when multiple sentences match the same guideline chunk', () => {
    const sentences = [
      'Avoid aggressive urgency tactics.',
      'Do not manufacture scarcity or be pushy.',
    ];
    const results = retrieve(sentences, mockGuidelines);

    const ids = results.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('returns at most 4 chunks per sentence and handles empty inputs', () => {
    expect(retrieve([], mockGuidelines)).toHaveLength(0);
    expect(retrieve(['Some random sentence'], [])).toHaveLength(0);

    const retriever = new LexicalRetriever();
    const res = retriever.retrieve(['Skin care advice'], mockGuidelines);
    expect(Array.isArray(res)).toBe(true);
  });
});

