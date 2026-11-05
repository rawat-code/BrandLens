import { describe, it, expect } from 'vitest';
import type { Finding } from '@/lib/types';

describe('Findings UI Logic & Data Helpers', () => {
  const sampleFindings: Finding[] = [
    {
      id: 'f-1',
      content_id: 'c-1',
      version: 1,
      rule_key: 'term.banned',
      origin: 'rule',
      category: 'terminology',
      severity: 'high',
      confidence: 1.0,
      excerpt: 'CURES',
      start_idx: 19,
      end_idx: 24,
      reason: 'Banned medical claim',
      source_type: 'term',
      source_id: 't-1',
      source_quote: 'cure',
      suggestion: 'supports healthy skin',
      intent_check: 'changed',
      intent_note: 'Shifts from medical cure to general skin support.',
      needs_human_check: false,
      requires_reviewer: true,
      status: 'open',
      dispute_reason: null,
    },
    {
      id: 'f-2',
      content_id: 'c-1',
      version: 1,
      rule_key: 'claim.absolute',
      origin: 'rule',
      category: 'claim',
      severity: 'high',
      confidence: 0.95,
      excerpt: '100% guaranteed',
      start_idx: 41,
      end_idx: 56,
      reason: 'Absolute efficacy guarantee',
      source_type: 'guideline',
      source_id: 'g-1',
      source_quote: 'Never guarantee 100% results',
      suggestion: 'visibly improves appearance',
      intent_check: 'preserved',
      intent_note: 'Maintains efficacy messaging.',
      needs_human_check: false,
      requires_reviewer: true,
      status: 'open',
      dispute_reason: null,
    },
    {
      id: 'f-3',
      content_id: 'c-1',
      version: 1,
      rule_key: 'a11y.vague_link',
      origin: 'rule',
      category: 'accessibility',
      severity: 'low',
      confidence: 0.9,
      excerpt: 'Click here',
      start_idx: 58,
      end_idx: 68,
      reason: 'Vague link text is inaccessible',
      source_type: 'guideline',
      source_id: 'g-2',
      source_quote: 'Use descriptive link text',
      suggestion: 'Explore our botanical skincare',
      intent_check: 'preserved',
      intent_note: 'Keeps call to action clear.',
      needs_human_check: false,
      requires_reviewer: false,
      status: 'open',
      dispute_reason: null,
    },
    {
      id: 'f-4',
      content_id: 'c-1',
      version: 1,
      rule_key: 'ai.tone.subtle_pressure',
      origin: 'ai',
      category: 'tone',
      severity: 'medium',
      confidence: 0.85,
      excerpt: 'in 7 days!!',
      start_idx: 28,
      end_idx: 39,
      reason: 'Urgency punctuation violates calm tone',
      source_type: null,
      source_id: null,
      source_quote: null,
      suggestion: 'in 7 days',
      intent_check: 'preserved',
      intent_note: 'Removes exclamation marks.',
      needs_human_check: true,
      requires_reviewer: false,
      status: 'open',
      dispute_reason: null,
    },
  ];

  it('groups findings by severity correctly', () => {
    const high = sampleFindings.filter((f) => f.severity === 'high');
    const medium = sampleFindings.filter((f) => f.severity === 'medium');
    const low = sampleFindings.filter((f) => f.severity === 'low');

    expect(high).toHaveLength(2);
    expect(medium).toHaveLength(1);
    expect(low).toHaveLength(1);
  });

  it('identifies AI-origin findings and human check requirements', () => {
    const aiFindings = sampleFindings.filter((f) => f.origin === 'ai');
    expect(aiFindings).toHaveLength(1);
    expect(aiFindings[0].rule_key).toBe('ai.tone.subtle_pressure');

    const humanCheckFindings = sampleFindings.filter((f) => f.needs_human_check);
    expect(humanCheckFindings).toHaveLength(1);
    expect(humanCheckFindings[0].id).toBe('f-4');
  });

  it('correctly maps intent preservation status and notes', () => {
    const preserved = sampleFindings.filter((f) => f.intent_check === 'preserved');
    const changed = sampleFindings.filter((f) => f.intent_check === 'changed');

    expect(preserved).toHaveLength(3);
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe('f-1');
    expect(changed[0].intent_note).toContain('medical cure');
  });

  it('calculates open findings counts by severity', () => {
    const counts = {
      high: sampleFindings.filter((f) => f.status === 'open' && f.severity === 'high').length,
      medium: sampleFindings.filter((f) => f.status === 'open' && f.severity === 'medium').length,
      low: sampleFindings.filter((f) => f.status === 'open' && f.severity === 'low').length,
    };

    expect(counts.high).toBe(2);
    expect(counts.medium).toBe(1);
    expect(counts.low).toBe(1);
  });
});
