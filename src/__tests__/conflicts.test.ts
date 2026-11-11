import { describe, it, expect } from 'vitest';
import { detectConflicts } from '@/lib/insights/conflicts';
import type { Guideline, Fact, Term } from '@/lib/types';

describe('Stage D: Improvement 3 - Conflicts & Contradiction Detection', () => {
  const mockGuidelines: Guideline[] = [
    {
      id: 'g-1',
      org_id: 'org-1',
      title: 'Brand Tone: Warm & Never Pushy',
      category: 'tone',
      body: 'Never use aggressive urgency tactics or guarantees. Must avoid sensationalist miracle claims.',
      version: 1,
    },
    {
      id: 'g-2',
      org_id: 'org-1',
      title: 'Packaging Guidance',
      category: 'general',
      body: 'Always emphasize recyclable post-consumer glass packaging across all serums.',
      version: 1,
    },
  ];

  const mockTerms: Term[] = [
    {
      id: 't-1',
      org_id: 'org-1',
      term: 'miracle',
      kind: 'banned',
      replacement: 'effective',
      note: 'Avoid unscientific sensationalism',
    },
    {
      id: 't-2',
      org_id: 'org-1',
      term: 'anti-aging magic',
      kind: 'banned',
      replacement: 'rejuvenating botanical care',
    },
  ];

  const mockFacts: Fact[] = [
    {
      id: 'f-1',
      org_id: 'org-1',
      statement: 'Guaranteed 100% cure for acne within 48 hours',
      status: 'approved',
    },
  ];

  it('detects contradiction when a guideline advises using a banned or caution term', () => {
    const contradictoryGuideline: Guideline = {
      id: 'g-bad',
      org_id: 'org-1',
      title: 'Promotional Headings',
      category: 'messaging',
      body: 'Always highlight miracle results in campaign headlines to drive engagement.',
      version: 1,
    };

    const conflicts = detectConflicts({
      guidelines: [...mockGuidelines, contradictoryGuideline],
      facts: [],
      terms: mockTerms,
    });

    expect(conflicts.length).toBeGreaterThan(0);
    const miracleConflict = conflicts.find((c) => c.topic.includes('miracle'));
    expect(miracleConflict).toBeDefined();
    expect(miracleConflict?.sourceA.id).toBe('g-bad');
    expect(miracleConflict?.sourceB.id).toBe('t-1');
  });

  it('detects tension between restrictive claim guidelines and approved facts with absolute claims', () => {
    const conflicts = detectConflicts({
      guidelines: mockGuidelines,
      facts: mockFacts,
      terms: [],
    });

    expect(conflicts.length).toBeGreaterThan(0);
    const factConflict = conflicts.find((c) => c.sourceB.type === 'fact');
    expect(factConflict).toBeDefined();
    expect(factConflict?.reason).toContain('specifies restrictive policy');
  });

  it('detects opposing polarities between guidelines sharing concept keywords', () => {
    const opposingGuidelines: Guideline[] = [
      {
        id: 'g-hydra-1',
        org_id: 'org-1',
        title: 'Hydration Messaging',
        category: 'messaging',
        body: 'Always emphasize hydration and moisture retention in daily serum descriptions.',
        version: 1,
      },
      {
        id: 'g-hydra-2',
        org_id: 'org-1',
        title: 'Clinical Claim Restrictions',
        category: 'claim',
        body: 'Never promise hydration and moisture retention benefits without clinical patch test verification.',
        version: 1,
      },
    ];

    const conflicts = detectConflicts({
      guidelines: opposingGuidelines,
      facts: [],
      terms: [],
    });

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].topic).toContain('Opposing polarities');
  });

  it('returns an empty array when no contradictions or polarity clashes exist', () => {
    const cleanGuidelines: Guideline[] = [
      {
        id: 'g-clean',
        org_id: 'org-1',
        title: 'General Identity',
        category: 'general',
        body: 'Spell brand name as Verdant Skin.',
        version: 1,
      },
    ];

    const conflicts = detectConflicts({
      guidelines: cleanGuidelines,
      facts: [],
      terms: [],
    });

    expect(conflicts).toHaveLength(0);
  });
});

