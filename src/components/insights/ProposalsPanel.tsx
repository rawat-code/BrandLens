'use client';

import { useState } from 'react';
import type { GuidelineProposal, Guideline } from '@/lib/types';

interface ProposalsPanelProps {
  proposals: GuidelineProposal[];
  guidelines: Guideline[];
  onProposalDecided?: () => void;
}

export function ProposalsPanel({
  proposals,
  guidelines,
  onProposalDecided,
}: ProposalsPanelProps) {
  const [actingId, setActingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const guidelineMap = new Map<string, Guideline>();
  for (const g of guidelines) {
    guidelineMap.set(g.id, g);
  }

  const handleDecision = async (proposalId: string, decision: 'approve' | 'reject') => {
    setActingId(proposalId);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/insights/proposals/${proposalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit decision');
      }

      if (onProposalDecided) {
        onProposalDecided();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error processing proposal decision');
    } finally {
      setActingId(null);
    }
  };

  const pending = proposals.filter((p) => p.status === 'pending');

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Guideline Clarification Proposals</span>
            {pending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {pending.length} pending
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-suggested wording improvements based on dispute reasons. Approving updates the guideline clarification and increments its version.
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

      {pending.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No pending clarification proposals. Click &quot;Suggest clearer wording&quot; in the Guideline Health table above to generate AI proposals.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((prop) => {
            const guideline = prop.guideline_id ? guidelineMap.get(prop.guideline_id) : undefined;
            const isSubmitting = actingId === prop.id;

            return (
              <div
                key={prop.id}
                className="p-4 rounded-xl border border-purple-200 bg-purple-50/20 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
                      Target Guideline Policy
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {guideline ? guideline.title : 'General Brand Standard'}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 self-start sm:self-auto">
                    <span>✨</span>
                    <span>Pending Human Approval</span>
                  </span>
                </div>

                {prop.reason && (
                  <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-purple-100">
                    <span className="font-semibold text-slate-700">Rationale: </span>
                    {prop.reason}
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Proposed Clarification Wording:
                  </span>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {prop.proposed_text}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-100">
                  <span className="text-[11px] text-slate-500 italic">
                    AI suggests, humans decide. Never applied automatically.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision(prop.id, 'reject')}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision(prop.id, 'approve')}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <span>Applying...</span>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Approve &amp; Bump Version</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
