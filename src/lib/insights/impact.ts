import type { Finding } from '@/lib/types';

export interface ProposalImpactResult {
  hasEnoughData: boolean;
  statusMessage: string;
  beforeTotal: number;
  beforeDisputed: number;
  beforeRate: number; // 0 to 1
  afterTotal: number;
  afterDisputed: number;
  afterRate: number; // 0 to 1
  relativeReductionPercent: number | null; // e.g. 62.5%
}

export const MIN_IMPACT_SAMPLE_SIZE = 5;

/**
 * Calculates before-and-after empirical impact for approved guideline proposals.
 * Analyzes dispute and dismiss rates within 30-day windows around applied_at.
 * Enforces a strict minimum-sample guard (<5 findings = "Not enough data yet").
 */
export function calculateProposalImpact({
  appliedAt,
  findings,
}: {
  appliedAt: string | null | undefined;
  findings: Array<{
    created_at?: string;
    status: Finding['status'];
    dispute_reason?: string | null;
  }>;
}): ProposalImpactResult {
  if (!appliedAt) {
    return {
      hasEnoughData: false,
      statusMessage: 'Proposal has not yet been applied.',
      beforeTotal: 0,
      beforeDisputed: 0,
      beforeRate: 0,
      afterTotal: 0,
      afterDisputed: 0,
      afterRate: 0,
      relativeReductionPercent: null,
    };
  }

  const appliedTime = new Date(appliedAt).getTime();
  const windowMs = 30 * 24 * 60 * 60 * 1000; // 30-day evaluation window

  const beforeFindings: typeof findings = [];
  const afterFindings: typeof findings = [];

  for (const f of findings) {
    if (!f.created_at) continue;
    const findingTime = new Date(f.created_at).getTime();

    if (findingTime < appliedTime && findingTime >= appliedTime - windowMs) {
      beforeFindings.push(f);
    } else if (findingTime >= appliedTime && findingTime <= appliedTime + windowMs) {
      afterFindings.push(f);
    }
  }

  const beforeTotal = beforeFindings.length;
  const beforeDisputed = beforeFindings.filter(
    (f) => f.status === 'disputed' || f.status === 'dismissed' || Boolean(f.dispute_reason)
  ).length;
  const beforeRate = beforeTotal > 0 ? beforeDisputed / beforeTotal : 0;

  const afterTotal = afterFindings.length;
  const afterDisputed = afterFindings.filter(
    (f) => f.status === 'disputed' || f.status === 'dismissed' || Boolean(f.dispute_reason)
  ).length;
  const afterRate = afterTotal > 0 ? afterDisputed / afterTotal : 0;

  // Strict minimum sample size guard: zero extrapolated percentages if either window has <5 findings
  if (beforeTotal < MIN_IMPACT_SAMPLE_SIZE || afterTotal < MIN_IMPACT_SAMPLE_SIZE) {
    return {
      hasEnoughData: false,
      statusMessage: `Not enough data yet (${beforeTotal} before, ${afterTotal} after; minimum ${MIN_IMPACT_SAMPLE_SIZE} required in each window).`,
      beforeTotal,
      beforeDisputed,
      beforeRate: Math.round(beforeRate * 100) / 100,
      afterTotal,
      afterDisputed,
      afterRate: Math.round(afterRate * 100) / 100,
      relativeReductionPercent: null,
    };
  }

  let relativeReduction: number;
  if (beforeRate === 0) {
    relativeReduction = afterRate === 0 ? 0 : -100;
  } else {
    relativeReduction = ((beforeRate - afterRate) / beforeRate) * 100;
  }

  const roundedReduction = Math.round(relativeReduction * 10) / 10;
  const message =
    roundedReduction >= 0
      ? `Dispute rate reduced by ${roundedReduction.toFixed(1)}% post-clarification.`
      : `Dispute rate changed by +${Math.abs(roundedReduction).toFixed(1)}% post-clarification.`;

  return {
    hasEnoughData: true,
    statusMessage: message,
    beforeTotal,
    beforeDisputed,
    beforeRate: Math.round(beforeRate * 100) / 100,
    afterTotal,
    afterDisputed,
    afterRate: Math.round(afterRate * 100) / 100,
    relativeReductionPercent: roundedReduction,
  };
}

