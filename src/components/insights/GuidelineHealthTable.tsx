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
    <div className="bg-[#fffdf8] p-5 border border-[#ddd5c4] rounded-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#ddd5c4] pb-2">
        <div>
          <h3 className="font-serif text-lg font-medium text-[#1f1c18]">
            Guideline health and ambiguity index
          </h3>
          <p className="text-xs text-[#5e574c] mt-0.5">
            Tracks review disputes, dismissals, and AI proposal clarifications. Guidelines with &ge; 3 findings and &ge; 33% overrides are marked &ldquo;Possibly unclear&rdquo;.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#fffdf8] border border-[#b3261e] text-xs text-[#b3261e] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs underline hover:opacity-75 cursor-pointer ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {healthStats.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
          No guidelines registered in the library yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#ddd5c4] bg-[#fffdf8]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#fffdf8] text-[#5e574c] font-mono uppercase text-[10px] tracking-[0.04em] border-b border-[#ddd5c4]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Guideline policy
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Findings
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Overrides
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Unclear score
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Clarity status
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ddd5c4] text-[#1f1c18]">
              {healthStats.map((row) => {
                const isGenerating = generatingId === row.guideline_id;
                const isSuccess = successId === row.guideline_id;

                return (
                  <tr
                    key={row.guideline_id}
                    className="hover:bg-[#f5f1e8] transition-colors duration-120"
                  >
                    <td className="px-3.5 py-3 font-medium max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#1f1c18] truncate" title={row.title}>
                          {row.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f1e8] text-[#5e574c] uppercase font-mono border border-[#ddd5c4]">
                          {row.category}
                        </span>
                      </div>
                      {row.conflict_note && (
                        <p className="text-[11px] text-[#8a5a00] mt-0.5 font-mono">
                          {row.conflict_note}
                        </p>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-center text-[#1f1c18] font-mono">
                      {row.total_findings}
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono">
                      <span className="text-[#8a5a00]">
                        {row.disputed_count + row.dismissed_count}
                      </span>
                      <span className="text-[10px] text-[#5e574c] block">
                        ({row.disputed_count} disp / {row.dismissed_count} dism)
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono">
                      {row.unclear_score !== null ? (
                        <span
                          className={
                            row.unclear_score >= 0.33 ? 'text-[#8a5a00] font-medium' : 'text-[#1f1c18]'
                          }
                        >
                          {Math.round(row.unclear_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-[#5e574c] text-[11px] italic">
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
                        <span className="text-xs font-mono text-[#1f6b3a] inline-flex items-center gap-1">
                          Proposal created
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
                          {isGenerating ? 'Drafting...' : 'Clarify wording'}
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
