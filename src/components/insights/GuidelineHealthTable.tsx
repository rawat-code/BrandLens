'use client';

import { useState } from 'react';
import type { GuidelineHealthStat } from '@/lib/types';

interface GuidelineHealthTableProps {
  healthStats: GuidelineHealthStat[];
  onProposalGenerated?: () => void;
}

export function GuidelineHealthTable({
  healthStats,
  onProposalGenerated,
}: GuidelineHealthTableProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateProposal = async (guidelineId: string) => {
    setGeneratingId(guidelineId);
    setErrorMsg(null);
    setSuccessId(null);

    try {
      const res = await fetch('/api/insights/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideline_id: guidelineId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate proposal');
      }

      setSuccessId(guidelineId);
      if (onProposalGenerated) {
        onProposalGenerated();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error communicating with AI service');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Guideline Health &amp; Ambiguity Index
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tracks review disputes, dismissals, and AI proposal clarifications. Guidelines with $\ge 3$ findings and $\ge 33\%$ overrides are marked &quot;Possibly unclear&quot;.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {healthStats.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No guidelines registered in the library yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Guideline Policy
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Findings
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Overrides
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Unclear Score
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Clarity Status
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-right">
                  AI Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {healthStats.map((row) => {
                const isGenerating = generatingId === row.guideline_id;
                const isSuccess = successId === row.guideline_id;

                return (
                  <tr
                    key={row.guideline_id}
                    className={`hover:bg-slate-50/75 transition-colors ${
                      row.is_possibly_unclear ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 truncate" title={row.title}>
                          {row.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono font-bold">
                          {row.category}
                        </span>
                      </div>
                      {row.conflict_note && (
                        <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                          <span>⚡</span>
                          <span>{row.conflict_note}</span>
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center text-slate-700 font-semibold">
                      {row.total_findings}
                    </td>

                    <td className="px-3 py-3 text-center text-slate-600">
                      <span className="text-amber-700 font-medium">
                        {row.disputed_count + row.dismissed_count}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({row.disputed_count} disp / {row.dismissed_count} dism)
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      {row.unclear_score !== null ? (
                        <span
                          className={`font-mono font-bold ${
                            row.unclear_score >= 0.33 ? 'text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          {Math.round(row.unclear_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          N/A (&lt;3 items)
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {row.is_possibly_unclear ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <span aria-hidden="true">⚠️</span>
                          <span>Possibly unclear</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span aria-hidden="true">✓</span>
                          <span>Healthy</span>
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {isSuccess ? (
                        <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <span>✓</span>
                          <span>Proposal Created!</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => handleGenerateProposal(row.guideline_id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border shadow-sm ${
                            row.is_possibly_unclear
                              ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent focus:ring-2 focus:ring-amber-500'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 focus:ring-2 focus:ring-emerald-500'
                          } disabled:opacity-50`}
                        >
                          {isGenerating ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin text-[10px]">⟳</span>
                              <span>Drafting...</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span>✨</span>
                              <span>Suggest clearer wording</span>
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
