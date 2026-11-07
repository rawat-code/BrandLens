'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  InsightsData,
  Guideline,
  UserRole,
} from '@/lib/types';
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
}

export function InsightsClientView({
  initialInsights,
  guidelines,
  userRole,
  isDemoHistoryActive: initialDemoActive,
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
