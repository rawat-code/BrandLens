'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  InsightsData,
  Guideline,
  GuidelineProposal,
  UserRole,
} from '@/lib/types';
import type { PossibleConflict } from '@/lib/insights/conflicts';
import type { ProposalImpactResult } from '@/lib/insights/impact';
import { SimpleBarChart } from './SimpleBarChart';
import { GuidelineHealthTable } from './GuidelineHealthTable';
import { ProposalsPanel } from './ProposalsPanel';
import { ReviewerOverridesTable } from './ReviewerOverridesTable';
import { StaleFactsTable } from './StaleFactsTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface InsightsClientViewProps {
  initialInsights: InsightsData;
  guidelines: Guideline[];
  userRole: UserRole;
  isDemoHistoryActive: boolean;
  orgName?: string;
  possibleConflicts?: PossibleConflict[];
  proposalsWithImpact?: Array<{ proposal: GuidelineProposal; impact: ProposalImpactResult }>;
}

export function InsightsClientView({
  initialInsights,
  guidelines,
  userRole,
  isDemoHistoryActive: initialDemoActive,
  possibleConflicts = [],
  proposalsWithImpact = [],
}: InsightsClientViewProps) {
  const router = useRouter();
  const [insights] = useState<InsightsData>(initialInsights);
  const [isDemoActive, setIsDemoActive] = useState(initialDemoActive);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const handleSeedDemoHistory = async () => {
    setIsSeeding(true);
    setSeedNotice(null);
    try {
      const res = await fetch('/api/insights/seed-demo', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to seed demo history');
      }
      setIsDemoActive(true);
      setSeedNotice('Demonstration history loaded with realistic repeated mistakes and overrides.');
      router.refresh();
    } catch (err: unknown) {
      setSeedNotice(`Error loading demo history: ${(err as Error).message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const unclearGuidelinesCount = insights.guideline_health.filter(
    (g) => g.is_possibly_unclear
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Header & Admin Actions */}
      <PageHeader
        title="Insights"
        description="Aggregated governance trends, reviewer overrides, and guideline ambiguity metrics for Verdant Skin."
        actions={
          (userRole === 'admin' || userRole === 'manager') ? (
            <div className="flex items-center gap-3">
              {isDemoActive && (
                <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-2 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#5e574c]">
                  Demo data
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={isSeeding}
                onClick={handleSeedDemoHistory}
                isLoading={isSeeding}
              >
                {isSeeding ? 'Loading history...' : 'Load demo history'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Seed Notice Banner */}
      {seedNotice && (
        <div
          role="status"
          className="p-3 bg-[#fffdf8] border border-[#ddd5c4] text-xs text-[#1f1c18] flex items-center justify-between"
        >
          <span>{seedNotice}</span>
          <button
            type="button"
            onClick={() => setSeedNotice(null)}
            className="text-xs underline hover:opacity-75 cursor-pointer ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Strip on Paper */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 bg-[#fffdf8] border border-[#ddd5c4] text-xs text-[#5e574c]">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#1f1c18] font-medium text-sm">
            {insights.total_findings_30d}
          </span>
          <span>findings cited (30d)</span>
        </div>
        <span className="text-[#ddd5c4]">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#1f1c18] font-medium text-sm">
            {Math.round(insights.dispute_rate * 100)}%
          </span>
          <span>dispute rate</span>
        </div>
        <span className="text-[#ddd5c4]">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#8a5a00] font-medium text-sm">
            {insights.reviewer_overrides.length}
          </span>
          <span>reviewer overrides</span>
        </div>
        <span className="text-[#ddd5c4]">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#b3261e] font-medium text-sm">
            {unclearGuidelinesCount}
          </span>
          <span>unclear guidelines</span>
        </div>
      </div>

      {/* Frequency Breakdown Charts (Inline SVG with ink bars and data tables) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleBarChart
          title="Most frequent findings by rule category"
          description="Distribution of flags cited across reviews"
          items={insights.category_frequencies.map((c) => ({
            label: c.category,
            count: c.count,
            percentage: c.percentage,
          }))}
          tableHeaders={['Category', 'Findings cited', 'Percentage']}
          emptyMessage="No findings recorded yet."
        />

        <SimpleBarChart
          title="Frequently cited rules and guidelines"
          description="Top rules triggered during pre-publication scans"
          items={insights.rule_frequencies.map((r) => ({
            label: r.rule_key,
            count: r.count,
            percentage: r.percentage,
          }))}
          tableHeaders={['Rule key', 'Citations', 'Share']}
          emptyMessage="No guideline citations recorded yet."
        />
      </div>

      {/* Guideline Health and Ambiguity Index Table */}
      <GuidelineHealthTable
        healthStats={insights.guideline_health}
        onProposalGenerated={() => router.refresh()}
      />

      {/* Clarification Proposals Panel */}
      <ProposalsPanel
        guidelines={guidelines}
        userRole={userRole}
      />

      {/* Before-and-After Impact Tracking (Stage D Improvement 3) */}
      <section className="bg-[#fffdf8] p-5 border border-[#ddd5c4] space-y-4">
        <div className="flex items-center justify-between border-b border-[#ddd5c4] pb-2 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1f1c18] flex items-center gap-2">
              <span>Guideline clarification impact</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[#1f6b3a] text-[#1f6b3a] bg-[#f0f9f3]">
                Closed Loop
              </span>
            </h3>
            <p className="text-xs text-[#5e574c] mt-0.5">
              Empirical before-and-after dispute and dismiss rates for adopted clarification proposals.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#5e574c]">
            30-day window · Min sample: 5
          </span>
        </div>

        {proposalsWithImpact.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
            No approved guideline proposals applied yet. When a manager or administrator approves a clarification proposal, its empirical dispute reduction will be tracked here.
          </div>
        ) : (
          <div className="space-y-3">
            {proposalsWithImpact.map(({ proposal, impact }) => (
              <div key={proposal.id} className="p-4 bg-[#fbf9f4] border border-[#ddd5c4] space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-[11px] font-medium text-[#1f1c18]">
                    Rule: {proposal.rule_key || 'General guideline'}
                  </span>
                  <div className="flex items-center gap-2">
                    {impact.hasEnoughData ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f0f9f3] text-[#1f6b3a] border border-[#1f6b3a] font-medium">
                        {impact.relativeReductionPercent && impact.relativeReductionPercent >= 0
                          ? `↓ ${impact.relativeReductionPercent.toFixed(1)}% disputes`
                          : `↑ ${Math.abs(impact.relativeReductionPercent || 0).toFixed(1)}% disputes`}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#fef9ec] text-[#8a5a00] border border-[#8a5a00]">
                        Not enough data yet
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#1f1c18] font-serif italic">
                  &ldquo;{proposal.proposed_text}&rdquo;
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 bg-[#fffdf8] border border-[#ddd5c4]">
                    <span className="text-[#5e574c] block text-[10px]">BEFORE (30D)</span>
                    <span className="font-medium text-[#1f1c18]">
                      {impact.beforeDisputed} / {impact.beforeTotal} ({Math.round(impact.beforeRate * 100)}%)
                    </span>
                  </div>
                  <div className="p-2 bg-[#fffdf8] border border-[#ddd5c4]">
                    <span className="text-[#5e574c] block text-[10px]">AFTER (30D)</span>
                    <span className="font-medium text-[#1f1c18]">
                      {impact.afterDisputed} / {impact.afterTotal} ({Math.round(impact.afterRate * 100)}%)
                    </span>
                  </div>
                  <div className="p-2 bg-[#fffdf8] border border-[#ddd5c4] sm:col-span-2">
                    <span className="text-[#5e574c] block text-[10px]">STATUS</span>
                    <span className="text-[#5e574c] truncate block">{impact.statusMessage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Possible Conflicts & Contradictions Panel */}
      <section className="bg-[#fffdf8] p-5 border border-[#ddd5c4] space-y-4">
        <div className="flex items-center justify-between border-b border-[#ddd5c4] pb-2 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1f1c18] flex items-center gap-2">
              <span>Possible library contradictions</span>
              {possibleConflicts.length > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[#8a5a00] text-[#8a5a00] bg-[#fef9ec]">
                  {possibleConflicts.length} possible
                </span>
              )}
            </h3>
            <p className="text-xs text-[#5e574c] mt-0.5">
              Deterministic cross-referencing between guidelines, approved facts, and restricted terminology. Labeled possible for human reviewer discretion.
            </p>
          </div>
        </div>

        {possibleConflicts.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#1f6b3a] bg-[#f0f9f3] border border-[#1f6b3a]">
            ✓ No apparent contradictions or polarity conflicts detected between guidelines, facts, and terms.
          </div>
        ) : (
          <div className="space-y-3">
            {possibleConflicts.map((c) => (
              <div key={c.id} className="p-4 bg-[#fbf9f4] border border-[#ddd5c4] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#1f1c18]">
                    {c.topic}
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
                    c.severity === 'high'
                      ? 'border-[#b3261e] text-[#b3261e] bg-[#fdf2f2]'
                      : 'border-[#8a5a00] text-[#8a5a00] bg-[#fef9ec]'
                  }`}>
                    Possible {c.severity} tension
                  </span>
                </div>
                <p className="text-[#5e574c] leading-relaxed">{c.reason}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 bg-[#fffdf8] border border-[#ddd5c4] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[#5e574c] block">
                      Source A ({c.sourceA.type}): {c.sourceA.title}
                    </span>
                    <p className="text-[11px] text-[#1f1c18] italic break-words">
                      &ldquo;{c.sourceA.excerpt}&rdquo;
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#fffdf8] border border-[#ddd5c4] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[#5e574c] block">
                      Source B ({c.sourceB.type}): {c.sourceB.title}
                    </span>
                    <p className="text-[11px] text-[#1f1c18] italic break-words">
                      &ldquo;{c.sourceB.excerpt}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviewer Overrides and Stale Facts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReviewerOverridesTable
          overrides={insights.reviewer_overrides}
        />
        <StaleFactsTable
          staleFacts={insights.stale_facts}
          expiredFactFindingsCount={insights.expired_fact_findings_count}
        />
      </div>
    </div>
  );
}
