import { describe, it, expect } from 'vitest';
import { calculateProposalImpact } from '@/lib/insights/impact';

describe('Stage D: Improvement 3 - Before-and-After Impact Tracking', () => {
  const appliedAt = '2026-10-15T12:00:00.000Z';
  const appliedTime = new Date(appliedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  it('returns hasEnoughData: false when appliedAt is missing', () => {
    const result = calculateProposalImpact({
      appliedAt: null,
      findings: [],
    });

    expect(result.hasEnoughData).toBe(false);
    expect(result.statusMessage).toContain('not yet been applied');
    expect(result.relativeReductionPercent).toBeNull();
  });

  it('enforces small-sample guard when either window has fewer than 5 findings', () => {
    // Only 3 findings before, 4 findings after
    const findings = [
      { created_at: new Date(appliedTime - 5 * dayMs).toISOString(), status: 'disputed' as const },
      { created_at: new Date(appliedTime - 3 * dayMs).toISOString(), status: 'open' as const },
      { created_at: new Date(appliedTime - 1 * dayMs).toISOString(), status: 'open' as const },
      { created_at: new Date(appliedTime + 2 * dayMs).toISOString(), status: 'open' as const },
      { created_at: new Date(appliedTime + 4 * dayMs).toISOString(), status: 'open' as const },
    ];

    const result = calculateProposalImpact({ appliedAt, findings });

    expect(result.hasEnoughData).toBe(false);
    expect(result.statusMessage).toContain('Not enough data yet');
    expect(result.relativeReductionPercent).toBeNull();
    expect(result.beforeTotal).toBe(3);
    expect(result.afterTotal).toBe(2);
  });

  it('calculates empirical dispute reduction percentage when both windows have at least 5 findings', () => {
    // 10 findings before: 4 disputed (40% dispute rate)
    const beforeFindings = Array.from({ length: 10 }).map((_, i) => ({
      created_at: new Date(appliedTime - (i + 1) * dayMs).toISOString(),
      status: (i < 4 ? 'disputed' : 'open') as 'disputed' | 'open',
    }));

    // 10 findings after: 1 disputed (10% dispute rate)
    const afterFindings = Array.from({ length: 10 }).map((_, i) => ({
      created_at: new Date(appliedTime + (i + 1) * dayMs).toISOString(),
      status: (i < 1 ? 'disputed' : 'open') as 'disputed' | 'open',
    }));

    const result = calculateProposalImpact({
      appliedAt,
      findings: [...beforeFindings, ...afterFindings],
    });

    expect(result.hasEnoughData).toBe(true);
    expect(result.beforeTotal).toBe(10);
    expect(result.beforeDisputed).toBe(4);
    expect(result.beforeRate).toBe(0.4);

    expect(result.afterTotal).toBe(10);
    expect(result.afterDisputed).toBe(1);
    expect(result.afterRate).toBe(0.1);

    // Relative reduction: ((0.4 - 0.1) / 0.4) * 100 = 75%
    expect(result.relativeReductionPercent).toBe(75);
    expect(result.statusMessage).toContain('Dispute rate reduced by 75.0%');
  });

  it('filters out findings created outside the 30-day window', () => {
    const oldFinding = {
      created_at: new Date(appliedTime - 45 * dayMs).toISOString(),
      status: 'disputed' as const,
    };
    const futureFinding = {
      created_at: new Date(appliedTime + 45 * dayMs).toISOString(),
      status: 'disputed' as const,
    };

    const result = calculateProposalImpact({
      appliedAt,
      findings: [oldFinding, futureFinding],
    });

    expect(result.beforeTotal).toBe(0);
    expect(result.afterTotal).toBe(0);
  });
});
