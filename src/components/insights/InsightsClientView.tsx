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
import { Badge } from '@/components/ui/Badge';

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
  orgName,
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
    <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
      {/* Top Header & Admin Actions */}
      <PageHeader
        title="Compliance insights"
        description={`Aggregated governance trends, reviewer overrides, and guideline ambiguity metrics for ${orgName || 'your organization'}.`}
        actions={
          (userRole === 'admin' || userRole === 'manager') ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={isSeeding}
              onClick={handleSeedDemoHistory}
              isLoading={isSeeding}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
            >
              {isSeeding ? 'Loading history...' : 'Load demo history'}
            </Button>
          ) : undefined
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="neutral">Last 30 days</Badge>
          {isDemoActive && (
            <Badge variant="indigo">Demo data active (fictional)</Badge>
          )}
        </div>
      </PageHeader>

      {/* Seed Notice Banner */}
      {seedNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-xs text-[#c7d2fe] flex items-center justify-between"
        >
          <span>{seedNotice}</span>
          <button
            type="button"
            onClick={() => setSeedNotice(null)}
            className="text-xs font-mono underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary KPI Strip */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 rounded-xl bg-[#11111a] border border-white/[0.08] text-xs text-[#a3a3bb]">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#ececf6] font-medium text-sm">
            {insights.total_findings_30d}
          </span>
          <span>findings cited (30d)</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#5fd1a0] font-medium text-sm">
            {Math.round(insights.dispute_rate * 100)}%
          </span>
          <span>dispute rate</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#f5b74f] font-medium text-sm">
            {insights.reviewer_overrides.length}
          </span>
          <span>reviewer overrides</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#ff7a8a] font-medium text-sm">
            {unclearGuidelinesCount}
          </span>
          <span>unclear guidelines</span>
        </div>
      </div>

      {/* Frequency Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SimpleBarChart
          title="Most frequent findings by rule category"
          description="Distribution of flags cited across reviews"
          items={insights.category_frequencies.map((c) => ({
            label: c.category,
            count: c.count,
            percentage: c.percentage,
          }))}
          tableHeaders={['Category', 'Findings cited', 'Percentage']}
          barColorClass="bg-gradient-to-r from-indigo-500 to-violet-600"
          emptyMessage="No findings recorded yet."
        />

        <SimpleBarChart
          title="Frequently cited rules & guidelines"
          description="Top rules triggered during pre-publication scans"
          items={insights.rule_frequencies.map((r) => ({
            label: r.rule_key,
            count: r.count,
            percentage: r.percentage,
          }))}
          tableHeaders={['Rule key', 'Citations', 'Share']}
          barColorClass="bg-gradient-to-r from-indigo-400 to-indigo-600"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
