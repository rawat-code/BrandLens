'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
    <div className="bg-[#11111a] p-5 rounded-xl border border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-[#ececf6]">
            Guideline health &amp; ambiguity index
          </h3>
          <p className="text-xs text-[#a3a3bb] mt-0.5">
            Tracks review disputes, dismissals, and AI proposal clarifications. Guidelines with $\ge 3$ findings and $\ge 33\%$ overrides are marked &quot;Possibly unclear&quot;.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-[#ff7a8a] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[#ff7a8a] hover:text-white font-mono ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {healthStats.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7b7b94] italic bg-[#171724] rounded-lg border border-dashed border-white/[0.06]">
          No guidelines registered in the library yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171724] text-[#a3a3bb] font-mono uppercase text-[10px] border-b border-white/[0.06]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Guideline policy
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Findings
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Overrides
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Unclear score
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Clarity status
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-right">
                  AI action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[#ececf6]">
              {healthStats.map((row) => {
                const isGenerating = generatingId === row.guideline_id;
                const isSuccess = successId === row.guideline_id;

                return (
                  <tr
                    key={row.guideline_id}
                    className="hover:bg-[#171724]/60 transition-colors"
                  >
                    <td className="px-3.5 py-3 font-medium max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#ececf6] truncate" title={row.title}>
                          {row.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171724] text-[#a3a3bb] uppercase font-mono border border-white/[0.06]">
                          {row.category}
                        </span>
                      </div>
                      {row.conflict_note && (
                        <p className="text-[11px] text-[#f5b74f] mt-0.5 flex items-center gap-1 font-mono">
                          <span>⚡</span>
                          <span>{row.conflict_note}</span>
                        </p>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-center text-[#ececf6] font-mono">
                      {row.total_findings}
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono">
                      <span className="text-[#f5b74f]">
                        {row.disputed_count + row.dismissed_count}
                      </span>
                      <span className="text-[10px] text-[#7b7b94] block">
                        ({row.disputed_count} disp / {row.dismissed_count} dism)
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono">
                      {row.unclear_score !== null ? (
                        <span
                          className={
                            row.unclear_score >= 0.33 ? 'text-[#f5b74f] font-medium' : 'text-[#ececf6]'
                          }
                        >
                          {Math.round(row.unclear_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-[#7b7b94] text-[11px] italic">
                          N/A (&lt;3 items)
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-3">
                      {row.is_possibly_unclear ? (
                        <Badge variant="medium">
                          Possibly unclear
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          Healthy
                        </Badge>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-right">
                      {isSuccess ? (
                        <span className="text-xs font-mono text-[#5fd1a0] inline-flex items-center gap-1">
                          <span>✓</span>
                          <span>Proposal created!</span>
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isGenerating}
                          isLoading={isGenerating}
                          onClick={() => handleGenerateProposal(row.guideline_id)}
                        >
                          {isGenerating ? 'Drafting...' : '✨ Clarify wording'}
                        </Button>
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
