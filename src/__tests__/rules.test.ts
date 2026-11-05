import { describe, it, expect } from 'vitest';
import { runRuleChecks } from '@/lib/review/rules';
import type { Term, Guideline, Fact } from '@/lib/types';

describe('Deterministic Review Rules Engine', () => {
  const mockTerms: Term[] = [
    {
      id: 'term-1',
      org_id: 'org-1',
      term: 'cure',
      kind: 'banned',
      replacement: 'support healthy skin',
      note: 'Cosmetics cannot claim to cure medical conditions.',
    },
    {
      id: 'term-2',
      org_id: 'org-1',
      term: 'natural',
      kind: 'caution',
      replacement: 'plant-derived',
      note: 'Ambiguous marketing term; specify botanical source.',
    },
  ];

  const mockGuidelines: Guideline[] = [
    {
      id: 'g-1',
      org_id: 'org-1',
      title: 'Brand Tone: Friendly, Never Pushy',
      category: 'tone',
      body: 'Never use aggressive urgency tactics.',
      version: 1,
    },
    {
      id: 'g-2',
      org_id: 'org-1',
      title: 'Claims Policy: Medical & Efficacy Guardrails',
      category: 'claim',
      body: 'Never guarantee 100% results.',
      version: 1,
    },
  ];

  const mockFacts: Fact[] = [
    {
      id: 'fact-1',
      org_id: 'org-1',
      statement: '78 percent reported smoother skin in 4 weeks',
      status: 'approved',
    },
    {
      id: 'fact-2',
      org_id: 'org-1',
      statement: 'Discontinued obsolete hydration claim formula',
      status: 'retired',
    },
  ];

  it('detects banned terms with high severity and exact citation (Rule 1)', () => {
    const findings = runRuleChecks({
      contentId: 'c-1',
      version: 1,
      body: 'This serum is guaranteed to cure severe eczema.',
      terms: mockTerms,
      guidelines: mockGuidelines,
      facts: mockFacts,
    });

    const bannedFinding = findings.find((f) => f.source_type === 'term' && f.source_id === 'term-1');
    expect(bannedFinding).toBeDefined();
    expect(bannedFinding?.severity).toBe('high');
    expect(bannedFinding?.suggestion).toBe('support healthy skin');
    expect(bannedFinding?.requires_reviewer).toBe(true);
    expect(bannedFinding?.needs_human_check).toBe(false);
  });

  it('detects caution terms with medium severity', () => {
    const findings = runRuleChecks({
      contentId: 'c-1',
      version: 1,
      body: 'Our formula is 100% natural and wholesome.',
      terms: mockTerms,
      guidelines: mockGuidelines,
      facts: mockFacts,
    });

    const cautionFinding = findings.find((f) => f.source_type === 'term' && f.source_id === 'term-2');
    expect(cautionFinding).toBeDefined();
    expect(cautionFinding?.severity).toBe('medium');
    expect(cautionFinding?.suggestion).toBe('plant-derived');
  });

  it('detects aggressive tone urgency and cites Tone guideline', () => {
    const findings = runRuleChecks({
      contentId: 'c-1',
      version: 1,
      body: 'Buy now before gone! Limited stock remaining.',
      terms: mockTerms,
      guidelines: mockGuidelines,
      facts: mockFacts,
    });

    const toneFinding = findings.find((f) => f.category === 'tone');
    expect(toneFinding).toBeDefined();
    expect(toneFinding?.source_type).toBe('guideline');
    expect(toneFinding?.source_id).toBe('g-1');
  });

  it('flags retired facts when referenced in copy', () => {
    const findings = runRuleChecks({
      contentId: 'c-1',
      version: 1,
      body: 'Our product relies on our obsolete hydration claim formula.',
      terms: mockTerms,
      guidelines: mockGuidelines,
      facts: mockFacts,
    });

    const factFinding = findings.find((f) => f.category === 'fact');
    expect(factFinding).toBeDefined();
    expect(factFinding?.source_id).toBe('fact-2');
    expect(factFinding?.needs_human_check).toBe(true);
  });

  it('returns no findings for clean compliant copy', () => {
    const findings = runRuleChecks({
      contentId: 'c-1',
      version: 1,
      body: 'Verdant Skin offers plant-derived botanical serums designed to gently support healthy skin vitality.',
      terms: mockTerms,
      guidelines: mockGuidelines,
      facts: mockFacts,
    });

    expect(findings.length).toBe(0);
  });
});
