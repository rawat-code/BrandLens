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

interface InsightsClientViewProps {
  initialInsights: InsightsData;
  guidelines: Guideline[];
  userRole: UserRole;
  isDemoHistoryActive: boolean;
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
    <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
      {/* Top Header & Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Compliance Insights
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Last 30 Days
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated governance trends, reviewer overrides, and guideline ambiguity metrics for{' '}
            <span className="font-semibold text-emerald-800">Verdant Skin</span>.
          </p>
        </div>

        {/* Load Demo History Admin Button */}
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedDemoHistory}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <span className="animate-spin text-xs">⟳</span>
                  <span>Loading History...</span>
                </>
              ) : (
                <>
                  <span>📊</span>
                  <span>Load demo history</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Synthetic Demo Banner if Active */}
      {isDemoActive && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <div>
              <span className="font-bold">Synthetic Demo Data Loaded:</span> Showing labeled demonstration violation history, repeated mistakes, and reviewer dispute logs.
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/70 text-amber-950">
            Demo Mode
          </span>
        </div>
      )}

      {seedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
          <span>{seedNotice}</span>
          <button
            onClick={() => setSeedNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            30d Review Findings
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {insights.total_findings_30d}
            </span>
            <span className="text-xs text-slate-500">total flags</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Reviewer Override Rate
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">
              {insights.dispute_rate}%
            </span>
            <span className="text-xs text-slate-500">disputed / dismissed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Stale / Expiring Facts
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold ${
                insights.stale_facts.length > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {insights.stale_facts.length}
            </span>
            <span className="text-xs text-slate-500">within 30d</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Guideline Health
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold ${
                unclearGuidelinesCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {unclearGuidelinesCount}
            </span>
            <span className="text-xs text-slate-500">possibly unclear</span>
          </div>
        </div>
      </div>

      {/* Grid 1: Rule & Category Frequencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleBarChart
          title="Most Frequent Violation Rules (Last 30 Days)"
          description="Deterministic and AI rule keys triggering the highest volume of flags."
          tableHeaders={['Rule Key', 'Flags', 'Share']}
          barColorClass="bg-rose-500"
          items={insights.rule_frequencies.map((r) => ({
            label: r.rule_key,
            count: r.count,
            percentage: r.percentage,
          }))}
          emptyMessage="No rule violations recorded in the last 30 days."
        />

        <SimpleBarChart
          title="Violations by Category (Last 30 Days)"
          description="Distribution of flags across brand governance domains."
          tableHeaders={['Category', 'Flags', 'Share']}
          barColorClass="bg-indigo-600"
          items={insights.category_frequencies.map((c) => ({
            label: c.category.toUpperCase(),
            count: c.count,
            percentage: c.percentage,
          }))}
          emptyMessage="No category violations recorded in the last 30 days."
        />
      </div>

      {/* Grid 2: Recurring Issues per Creator & Channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Creator recurring issues (managers and admins only) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recurring Issues per Creator
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                Manager Eyes Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies coaching opportunities and repeated rule mistakes by author.
            </p>
          </div>

          {insights.creator_issues.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No creator findings recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {insights.creator_issues.map((creator) => (
                <div
                  key={creator.creator_id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{creator.creator_name}</span>
                    <span className="font-semibold text-slate-600">
                      {creator.total_findings} {creator.total_findings === 1 ? 'flag' : 'flags'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.top_rule_keys.map((trk) => (
                      <span
                        key={trk.rule_key}
                        className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono"
                      >
                        {trk.rule_key}: <span className="font-bold">{trk.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel recurring issues */}
        <SimpleBarChart
          title="Recurring Issues per Content Channel"
          description="Distribution of findings across social, blog, email, and packaging channels."
          tableHeaders={['Channel', 'Flags', 'Share']}
          barColorClass="bg-amber-500"
          items={insights.channel_issues.map((ch) => ({
            label: ch.channel.toUpperCase(),
            count: ch.total_findings,
            percentage:
              insights.total_findings_30d > 0
                ? Math.round((ch.total_findings / insights.total_findings_30d) * 100)
                : 0,
          }))}
          emptyMessage="No channel data available."
        />
      </div>

      {/* Reviewer Overrides & Dispute Log */}
      <ReviewerOverridesTable overrides={insights.reviewer_overrides} />

      {/* Stale & Expiring Clinical Facts */}
      <StaleFactsTable
        staleFacts={insights.stale_facts}
        expiredFactFindingsCount={insights.expired_fact_findings_count}
      />

      {/* Guideline Health & Ambiguity Index */}
      <GuidelineHealthTable
        healthStats={insights.guideline_health}
        onProposalGenerated={() => router.refresh()}
      />

      {/* Pending Guideline Clarification Proposals Panel */}
      <ProposalsPanel
        proposals={insights.pending_proposals}
        guidelines={guidelines}
        onProposalDecided={() => router.refresh()}
      />
    </div>
  );
}
