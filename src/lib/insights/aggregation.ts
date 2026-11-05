import type {
  Finding,
  Content,
  Profile,
  Fact,
  Guideline,
  GuidelineProposal,
  RuleFrequencyStat,
  CategoryStat,
  CreatorIssueStat,
  ChannelIssueStat,
  ReviewerOverrideStat,
  StaleFactStat,
  GuidelineHealthStat,
  InsightsData,
  FindingCategory,
} from '@/lib/types';

/**
 * Filter findings created within the last N days.
 * If finding created_at is missing, includes it by default.
 */
export function filterFindingsByWindow(
  findings: Finding[],
  days: number = 30,
  referenceDate: Date = new Date()
): Finding[] {
  const cutoff = new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
  return findings.filter((f) => {
    if (!f.created_at) return true;
    const createdAt = new Date(f.created_at);
    return createdAt >= cutoff;
  });
}

/**
 * Calculate most frequent rule_keys over the specified timeframe.
 */
export function calculateRuleFrequencies(
  findings: Finding[],
  days: number = 30,
  referenceDate: Date = new Date()
): RuleFrequencyStat[] {
  const windowed = filterFindingsByWindow(findings, days, referenceDate);
  const total = windowed.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {};
  for (const f of windowed) {
    counts[f.rule_key] = (counts[f.rule_key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([rule_key, count]) => ({
      rule_key,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate most frequent violation categories over the specified timeframe.
 */
export function calculateCategoryFrequencies(
  findings: Finding[],
  days: number = 30,
  referenceDate: Date = new Date()
): CategoryStat[] {
  const windowed = filterFindingsByWindow(findings, days, referenceDate);
  const total = windowed.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {};
  for (const f of windowed) {
    counts[f.category] = (counts[f.category] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([category, count]) => ({
      category: category as FindingCategory,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Recurring issues per creator (visible to managers and admins only).
 */
export function calculateCreatorIssues(
  findings: Finding[],
  contents: Content[],
  profiles: Profile[]
): CreatorIssueStat[] {
  const contentToCreator = new Map<string, string>();
  for (const c of contents) {
    contentToCreator.set(c.id, c.created_by);
  }

  const profileMap = new Map<string, Profile>();
  for (const p of profiles) {
    profileMap.set(p.id, p);
  }

  // Group findings by creatorId
  const creatorFindings = new Map<string, Finding[]>();
  for (const f of findings) {
    const creatorId = contentToCreator.get(f.content_id);
    if (!creatorId) continue;
    const existing = creatorFindings.get(creatorId) || [];
    existing.push(f);
    creatorFindings.set(creatorId, existing);
  }

  const result: CreatorIssueStat[] = [];
  for (const [creatorId, cFindings] of creatorFindings.entries()) {
    const profile = profileMap.get(creatorId);
    const creatorName = profile?.full_name || 'Unknown Creator';
    const role = profile?.role || 'creator';

    // Count rule_keys for this creator
    const ruleCounts: Record<string, number> = {};
    for (const f of cFindings) {
      ruleCounts[f.rule_key] = (ruleCounts[f.rule_key] || 0) + 1;
    }

    const topRules = Object.entries(ruleCounts)
      .map(([rule_key, count]) => ({ rule_key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    result.push({
      creator_id: creatorId,
      creator_name: creatorName,
      role,
      total_findings: cFindings.length,
      top_rule_keys: topRules,
    });
  }

  return result.sort((a, b) => b.total_findings - a.total_findings);
}

/**
 * Recurring issues per channel (e.g. instagram, blog, email, packaging).
 */
export function calculateChannelIssues(
  findings: Finding[],
  contents: Content[]
): ChannelIssueStat[] {
  const contentToChannel = new Map<string, string>();
  for (const c of contents) {
    contentToChannel.set(c.id, (c.channel || 'unspecified').toLowerCase());
  }

  const channelFindings = new Map<string, Finding[]>();
  for (const f of findings) {
    const channel = contentToChannel.get(f.content_id) || 'unspecified';
    const existing = channelFindings.get(channel) || [];
    existing.push(f);
    channelFindings.set(channel, existing);
  }

  const result: ChannelIssueStat[] = [];
  for (const [channel, chFindings] of channelFindings.entries()) {
    const catCounts: Record<string, number> = {};
    for (const f of chFindings) {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    }

    const topCats = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    result.push({
      channel,
      total_findings: chFindings.length,
      top_categories: topCats,
    });
  }

  return result.sort((a, b) => b.total_findings - a.total_findings);
}

/**
 * Reviewer overrides: findings disputed or dismissed, grouped by rule_key, with reasons listed.
 */
export function calculateReviewerOverrides(findings: Finding[]): ReviewerOverrideStat[] {
  const overrideFindings = findings.filter(
    (f) => f.status === 'disputed' || f.status === 'dismissed'
  );

  const groups = new Map<
    string,
    { disputed: number; dismissed: number; reasons: Set<string> }
  >();

  for (const f of overrideFindings) {
    const entry = groups.get(f.rule_key) || {
      disputed: 0,
      dismissed: 0,
      reasons: new Set<string>(),
    };

    if (f.status === 'disputed') entry.disputed++;
    if (f.status === 'dismissed') entry.dismissed++;

    if (f.dispute_reason && f.dispute_reason.trim()) {
      entry.reasons.add(f.dispute_reason.trim());
    }

    groups.set(f.rule_key, entry);
  }

  const result: ReviewerOverrideStat[] = [];
  for (const [rule_key, g] of groups.entries()) {
    result.push({
      rule_key,
      disputed_count: g.disputed,
      dismissed_count: g.dismissed,
      total_overrides: g.disputed + g.dismissed,
      reasons: Array.from(g.reasons),
    });
  }

  return result.sort((a, b) => b.total_overrides - a.total_overrides);
}

/**
 * Stale facts: facts expired or expiring within 30 days, and citation counts.
 */
export function calculateStaleFacts(
  facts: Fact[],
  findings: Finding[],
  referenceDate: Date = new Date()
): { stale_facts: StaleFactStat[]; expired_fact_findings_count: number } {
  // Map fact_id -> findings count
  const citations = new Map<string, number>();
  let expiredFactFindingsCount = 0;

  for (const f of findings) {
    if (f.source_type === 'fact' && f.source_id) {
      citations.set(f.source_id, (citations.get(f.source_id) || 0) + 1);
    }
    if (f.rule_key === 'fact.expired') {
      expiredFactFindingsCount++;
    }
  }

  const staleList: StaleFactStat[] = [];

  for (const fact of facts) {
    if (!fact.expires_at) continue;
    const expDate = new Date(fact.expires_at);
    const msDiff = expDate.getTime() - referenceDate.getTime();
    const daysUntil = Math.ceil(msDiff / (24 * 60 * 60 * 1000));

    const isExpired = fact.status === 'expired' || daysUntil <= 0;
    const isExpiringSoon = !isExpired && daysUntil <= 30;

    if (isExpired || isExpiringSoon) {
      const citedCount = citations.get(fact.id) || 0;
      if (isExpired && citedCount > 0) {
        expiredFactFindingsCount += citedCount;
      }

      staleList.push({
        fact_id: fact.id,
        statement: fact.statement,
        expires_at: fact.expires_at,
        status: isExpired ? 'expired' : 'expiring_soon',
        days_until_expiration: daysUntil,
        cited_in_findings_count: citedCount,
      });
    }
  }

  // Sort by days_until_expiration ascending (most critically expired first)
  staleList.sort((a, b) => a.days_until_expiration - b.days_until_expiration);

  return {
    stale_facts: staleList,
    expired_fact_findings_count: expiredFactFindingsCount,
  };
}

/**
 * Guideline Health: compute "unclear score" = (disputed + dismissed) / total (when total >= 3),
 * detect conflicting suggestions, and rank guidelines marking "Possibly unclear".
 */
export function calculateGuidelineHealth(
  guidelines: Guideline[],
  findings: Finding[]
): GuidelineHealthStat[] {
  // Map guidelineId / title to findings
  const gFindings = new Map<string, Finding[]>();

  for (const f of findings) {
    if (f.source_type === 'guideline' && f.source_id) {
      const list = gFindings.get(f.source_id) || [];
      list.push(f);
      gFindings.set(f.source_id, list);
    }
  }

  const result: GuidelineHealthStat[] = [];

  for (const g of guidelines) {
    const list = gFindings.get(g.id) || [];
    const total = list.length;
    let disputed = 0;
    let dismissed = 0;

    // Check for conflicting suggestions on same/similar excerpt
    const suggestionMap = new Map<string, Set<string>>();
    let hasConflictingSuggestions = false;
    let conflictNote: string | null = null;

    for (const f of list) {
      if (f.status === 'disputed') disputed++;
      if (f.status === 'dismissed') dismissed++;

      if (f.excerpt && f.suggestion) {
        const normExcerpt = f.excerpt.trim().toLowerCase();
        const normSugg = f.suggestion.trim().toLowerCase();
        const set = suggestionMap.get(normExcerpt) || new Set<string>();
        set.add(normSugg);
        suggestionMap.set(normExcerpt, set);
        if (set.size > 1) {
          hasConflictingSuggestions = true;
          conflictNote = `Conflicting suggestions generated for excerpt "${f.excerpt}" across reviews.`;
        }
      }
    }

    let unclearScore: number | null = null;
    if (total >= 3) {
      unclearScore = Math.round(((disputed + dismissed) / total) * 100) / 100;
    }

    // Flag "Possibly unclear" if unclearScore >= 0.33 OR conflicting suggestions with at least 2 findings
    const isPossiblyUnclear =
      (unclearScore !== null && unclearScore >= 0.33) ||
      (hasConflictingSuggestions && total >= 2);

    result.push({
      guideline_id: g.id,
      title: g.title,
      category: g.category,
      total_findings: total,
      disputed_count: disputed,
      dismissed_count: dismissed,
      unclear_score: unclearScore,
      has_conflicting_suggestions: hasConflictingSuggestions,
      conflict_note: conflictNote,
      is_possibly_unclear: isPossiblyUnclear,
    });
  }

  // Sort: Possibly unclear first, then by unclear_score desc, then by total findings desc
  return result.sort((a, b) => {
    if (a.is_possibly_unclear && !b.is_possibly_unclear) return -1;
    if (!a.is_possibly_unclear && b.is_possibly_unclear) return 1;
    const scoreA = a.unclear_score ?? -1;
    const scoreB = b.unclear_score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.total_findings - a.total_findings;
  });
}

/**
 * Top-level aggregation function assembling complete InsightsData.
 */
export function calculateInsights({
  findings,
  contents,
  profiles,
  guidelines,
  facts,
  proposals = [],
  referenceDate = new Date(),
}: {
  findings: Finding[];
  contents: Content[];
  profiles: Profile[];
  guidelines: Guideline[];
  facts: Fact[];
  proposals?: GuidelineProposal[];
  referenceDate?: Date;
}): InsightsData {
  const windowed30d = filterFindingsByWindow(findings, 30, referenceDate);
  const totalFindings30d = windowed30d.length;

  const disputedOrDismissed30d = windowed30d.filter(
    (f) => f.status === 'disputed' || f.status === 'dismissed'
  ).length;

  const disputeRate =
    totalFindings30d > 0
      ? Math.round((disputedOrDismissed30d / totalFindings30d) * 100)
      : 0;

  const ruleFrequencies = calculateRuleFrequencies(findings, 30, referenceDate);
  const categoryFrequencies = calculateCategoryFrequencies(findings, 30, referenceDate);
  const creatorIssues = calculateCreatorIssues(findings, contents, profiles);
  const channelIssues = calculateChannelIssues(findings, contents);
  const reviewerOverrides = calculateReviewerOverrides(findings);
  const { stale_facts, expired_fact_findings_count } = calculateStaleFacts(
    facts,
    findings,
    referenceDate
  );
  const guidelineHealth = calculateGuidelineHealth(guidelines, findings);
  const pendingProposals = proposals.filter((p) => p.status === 'pending');

  return {
    timeframe_days: 30,
    total_findings_30d: totalFindings30d,
    dispute_rate: disputeRate,
    rule_frequencies: ruleFrequencies,
    category_frequencies: categoryFrequencies,
    creator_issues: creatorIssues,
    channel_issues: channelIssues,
    reviewer_overrides: reviewerOverrides,
    stale_facts,
    expired_fact_findings_count,
    guideline_health: guidelineHealth,
    pending_proposals: pendingProposals,
  };
}
