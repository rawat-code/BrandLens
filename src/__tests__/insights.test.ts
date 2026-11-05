import { describe, it, expect } from 'vitest';
import {
  filterFindingsByWindow,
  calculateRuleFrequencies,
  calculateCategoryFrequencies,
  calculateCreatorIssues,
  calculateChannelIssues,
  calculateReviewerOverrides,
  calculateStaleFacts,
  calculateGuidelineHealth,
  calculateInsights,
} from '@/lib/insights/aggregation';
import type { Finding, Content, Profile, Fact, Guideline } from '@/lib/types';

describe('Insights Server-Side Aggregation Engine', () => {
  const now = new Date('2026-11-05T12:00:00Z');

  const mockProfiles: Profile[] = [
    { id: 'creator-1', org_id: 'org-1', role: 'creator', full_name: 'Chloe Creator' },
    { id: 'creator-2', org_id: 'org-1', role: 'creator', full_name: 'Sam Second' },
    { id: 'manager-1', org_id: 'org-1', role: 'manager', full_name: 'Marcus Manager' },
  ];

  const mockContents: Content[] = [
    {
      id: 'content-1',
      org_id: 'org-1',
      title: 'Serum Post',
      channel: 'instagram',
      confidential: false,
      status: 'draft',
      created_by: 'creator-1',
      current_version: 1,
    },
    {
      id: 'content-2',
      org_id: 'org-1',
      title: 'Blog Article',
      channel: 'blog',
      confidential: false,
      status: 'draft',
      created_by: 'creator-2',
      current_version: 1,
    },
  ];

  const mockGuidelines: Guideline[] = [
    {
      id: 'g-1',
      org_id: 'org-1',
      title: 'Gentle Botanical Claims',
      category: 'tone',
      body: 'Do not claim to cure skin conditions.',
      version: 1,
    },
    {
      id: 'g-2',
      org_id: 'org-1',
      title: 'Accessibility Contrast',
      category: 'accessibility',
      body: 'Ensure legible copy.',
      version: 1,
    },
  ];

  const mockFacts: Fact[] = [
    {
      id: 'fact-1',
      org_id: 'org-1',
      statement: '92% organic aloe',
      expires_at: '2026-10-15T00:00:00Z', // Expired 21 days ago
      status: 'expired',
    },
    {
      id: 'fact-2',
      org_id: 'org-1',
      statement: 'Clinically tested for 48 hours hydration',
      expires_at: '2026-11-20T00:00:00Z', // Expiring in 15 days
      status: 'approved',
    },
    {
      id: 'fact-3',
      org_id: 'org-1',
      statement: 'Sustainable packaging sourced in EU',
      expires_at: '2027-05-01T00:00:00Z', // Far future
      status: 'approved',
    },
  ];

  const mockFindings: Finding[] = [
    // Finding 1: within 30d, disputed
    {
      id: 'f-1',
      content_id: 'content-1',
      version: 1,
      rule_key: 'term.banned',
      origin: 'rule',
      category: 'terminology',
      severity: 'high',
      confidence: 1,
      excerpt: 'miracle',
      reason: 'Banned term',
      source_type: 'guideline',
      source_id: 'g-1',
      suggestion: 'effective',
      intent_check: 'preserved',
      needs_human_check: false,
      requires_reviewer: false,
      status: 'disputed',
      dispute_reason: 'Miracle was used in a poetic quote',
      created_at: '2026-11-01T10:00:00Z',
    },
    // Finding 2: within 30d, dismissed
    {
      id: 'f-2',
      content_id: 'content-1',
      version: 1,
      rule_key: 'claim.absolute',
      origin: 'rule',
      category: 'claim',
      severity: 'high',
      confidence: 1,
      excerpt: '100% cure',
      reason: 'Absolute claim',
      source_type: 'guideline',
      source_id: 'g-1',
      suggestion: 'supports barrier repair',
      intent_check: 'changed',
      needs_human_check: false,
      requires_reviewer: true,
      status: 'dismissed',
      dispute_reason: 'Internal lab verified claim',
      created_at: '2026-11-02T10:00:00Z',
    },
    // Finding 3: within 30d, open
    {
      id: 'f-3',
      content_id: 'content-1',
      version: 1,
      rule_key: 'claim.absolute',
      origin: 'rule',
      category: 'claim',
      severity: 'high',
      confidence: 1,
      excerpt: 'guaranteed results',
      reason: 'Absolute claim',
      source_type: 'guideline',
      source_id: 'g-1',
      suggestion: 'proven satisfaction',
      intent_check: 'changed',
      needs_human_check: false,
      requires_reviewer: true,
      status: 'open',
      created_at: '2026-11-03T10:00:00Z',
    },
    // Finding 4: within 30d, referencing expired fact
    {
      id: 'f-4',
      content_id: 'content-2',
      version: 1,
      rule_key: 'fact.expired',
      origin: 'rule',
      category: 'fact',
      severity: 'medium',
      confidence: 1,
      excerpt: '92% organic aloe',
      reason: 'Fact expired on 2026-10-15',
      source_type: 'fact',
      source_id: 'fact-1',
      suggestion: null,
      intent_check: null,
      needs_human_check: false,
      requires_reviewer: false,
      status: 'open',
      created_at: '2026-11-04T10:00:00Z',
    },
    // Finding 5: outside 30d window (45 days ago)
    {
      id: 'f-5',
      content_id: 'content-2',
      version: 1,
      rule_key: 'a11y.allcaps',
      origin: 'rule',
      category: 'accessibility',
      severity: 'low',
      confidence: 1,
      excerpt: 'BUY NOW',
      reason: 'All caps text',
      source_type: 'guideline',
      source_id: 'g-2',
      suggestion: 'Buy now',
      intent_check: 'preserved',
      needs_human_check: false,
      requires_reviewer: false,
      status: 'accepted',
      created_at: '2026-09-20T10:00:00Z',
    },
  ];

  it('filters findings by 30-day window', () => {
    const windowed = filterFindingsByWindow(mockFindings, 30, now);
    expect(windowed.length).toBe(4);
    expect(windowed.some((f) => f.id === 'f-5')).toBe(false);
  });

  it('calculates frequent rule_keys and categories over last 30 days', () => {
    const rules = calculateRuleFrequencies(mockFindings, 30, now);
    expect(rules[0].rule_key).toBe('claim.absolute');
    expect(rules[0].count).toBe(2);
    expect(rules[0].percentage).toBe(50);

    const categories = calculateCategoryFrequencies(mockFindings, 30, now);
    expect(categories.find((c) => c.category === 'claim')?.count).toBe(2);
    expect(categories.find((c) => c.category === 'terminology')?.count).toBe(1);
  });

  it('aggregates recurring issues per creator and per channel', () => {
    const creatorIssues = calculateCreatorIssues(mockFindings, mockContents, mockProfiles);
    expect(creatorIssues.length).toBe(2);
    expect(creatorIssues[0].creator_id).toBe('creator-1');
    expect(creatorIssues[0].total_findings).toBe(3);
    expect(creatorIssues[0].top_rule_keys[0].rule_key).toBe('claim.absolute');

    const channelIssues = calculateChannelIssues(mockFindings, mockContents);
    expect(channelIssues.find((c) => c.channel === 'instagram')?.total_findings).toBe(3);
    expect(channelIssues.find((c) => c.channel === 'blog')?.total_findings).toBe(2);
  });

  it('groups reviewer overrides by rule_key with reasons listed', () => {
    const overrides = calculateReviewerOverrides(mockFindings);
    expect(overrides.length).toBe(2);

    const bannedTermOverride = overrides.find((o) => o.rule_key === 'term.banned');
    expect(bannedTermOverride?.disputed_count).toBe(1);
    expect(bannedTermOverride?.dismissed_count).toBe(0);
    expect(bannedTermOverride?.reasons).toContain('Miracle was used in a poetic quote');

    const claimOverride = overrides.find((o) => o.rule_key === 'claim.absolute');
    expect(claimOverride?.disputed_count).toBe(0);
    expect(claimOverride?.dismissed_count).toBe(1);
    expect(claimOverride?.reasons).toContain('Internal lab verified claim');
  });

  it('identifies stale facts expired or expiring within 30 days', () => {
    const { stale_facts, expired_fact_findings_count } = calculateStaleFacts(
      mockFacts,
      mockFindings,
      now
    );

    expect(stale_facts.length).toBe(2);
    const expiredFact = stale_facts.find((f) => f.fact_id === 'fact-1');
    expect(expiredFact?.status).toBe('expired');
    expect(expiredFact?.days_until_expiration).toBeLessThan(0);
    expect(expiredFact?.cited_in_findings_count).toBe(1);

    const expiringSoon = stale_facts.find((f) => f.fact_id === 'fact-2');
    expect(expiringSoon?.status).toBe('expiring_soon');
    expect(expiringSoon?.days_until_expiration).toBe(15);

    expect(expired_fact_findings_count).toBeGreaterThan(0);
  });

  it('computes guideline health, unclear score, and flags "Possibly unclear"', () => {
    const health = calculateGuidelineHealth(mockGuidelines, mockFindings);

    const g1 = health.find((h) => h.guideline_id === 'g-1');
    expect(g1).toBeDefined();
    expect(g1?.total_findings).toBe(3);
    expect(g1?.disputed_count).toBe(1);
    expect(g1?.dismissed_count).toBe(1);
    // Unclear score = (1 + 1) / 3 = 0.67
    expect(g1?.unclear_score).toBe(0.67);
    expect(g1?.is_possibly_unclear).toBe(true);

    const g2 = health.find((h) => h.guideline_id === 'g-2');
    expect(g2).toBeDefined();
    expect(g2?.total_findings).toBe(1);
    // < 3 findings -> unclear_score must be null
    expect(g2?.unclear_score).toBeNull();
    expect(g2?.is_possibly_unclear).toBe(false);
  });

  it('detects conflicting suggestions on the same excerpt for a guideline', () => {
    const conflictingFindings: Finding[] = [
      {
        ...mockFindings[0],
        id: 'cf-1',
        excerpt: 'botanical blend',
        suggestion: 'organic plant complex',
      },
      {
        ...mockFindings[0],
        id: 'cf-2',
        excerpt: 'botanical blend',
        suggestion: 'synthetic gentle blend',
      },
    ];

    const health = calculateGuidelineHealth(mockGuidelines, conflictingFindings);
    const g1 = health.find((h) => h.guideline_id === 'g-1');
    expect(g1?.has_conflicting_suggestions).toBe(true);
    expect(g1?.is_possibly_unclear).toBe(true);
  });

  it('assembles complete InsightsData', () => {
    const insights = calculateInsights({
      findings: mockFindings,
      contents: mockContents,
      profiles: mockProfiles,
      guidelines: mockGuidelines,
      facts: mockFacts,
      referenceDate: now,
    });

    expect(insights.total_findings_30d).toBe(4);
    expect(insights.dispute_rate).toBe(50); // 2 out of 4 are disputed or dismissed
    expect(insights.rule_frequencies.length).toBeGreaterThan(0);
    expect(insights.category_frequencies.length).toBeGreaterThan(0);
    expect(insights.creator_issues.length).toBe(2);
    expect(insights.channel_issues.length).toBe(2);
    expect(insights.reviewer_overrides.length).toBe(2);
    expect(insights.stale_facts.length).toBe(2);
    expect(insights.guideline_health.length).toBe(2);
  });
});
