'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GuidelineProposal, Guideline, UserRole } from '@/lib/types';

interface ProposalsPanelProps {
  proposals?: GuidelineProposal[];
  guidelines: Guideline[];
  userRole?: UserRole;
  onProposalDecided?: () => void;
}

export function ProposalsPanel({
  proposals = [],
  guidelines,
  userRole,
  onProposalDecided,
}: ProposalsPanelProps) {
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
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
    <div className="bg-[#11111a] p-5 rounded-xl border border-white/[0.08] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#ececf6] flex items-center gap-2">
            <span>Guideline clarification proposals</span>
            {pending.length > 0 && (
              <Badge variant="indigo">
                {pending.length} pending
              </Badge>
            )}
          </h3>
          <p className="text-xs text-[#a3a3bb] mt-0.5">
            AI-suggested wording improvements based on dispute reasons. Approving updates the guideline clarification and increments its version.
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

      {pending.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7b7b94] italic bg-[#171724] rounded-lg border border-dashed border-white/[0.06]">
          No pending clarification proposals. Click &quot;Clarify wording&quot; in the Guideline Health table above to generate AI proposals.
        </div>
      ) : (
        <div className="space-y-3.5">
          {pending.map((prop) => {
            const guideline = prop.guideline_id ? guidelineMap.get(prop.guideline_id) : undefined;
            const isSubmitting = actingId === prop.id;

            return (
              <div
                key={prop.id}
                className="p-4 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.04] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div>
                    <span className="text-[10px] font-mono text-[#a5b4fc] uppercase tracking-wider block">
                      Target guideline policy
                    </span>
                    <h4 className="text-sm font-medium text-[#ececf6]">
                      {guideline ? guideline.title : 'General Brand Standard'}
                    </h4>
                  </div>
                  <Badge variant="ai">
                    Pending human approval
                  </Badge>
                </div>

                {prop.reason && (
                  <div className="text-xs text-[#a3a3bb] bg-[#171724] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="font-medium text-[#ececf6]">Rationale: </span>
                    {prop.reason}
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-mono uppercase text-[#7b7b94] block mb-1">
                    Proposed clarification wording:
                  </span>
                  <div className="p-3 bg-[#0a0a10] rounded-lg border border-white/[0.06] text-xs text-[#ececf6] whitespace-pre-wrap font-mono leading-relaxed">
                    {prop.proposed_text}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] text-[#7b7b94] italic">
                    AI suggests, humans decide. Never applied automatically.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting || !isAdminOrManager}
                      onClick={() => handleDecision(prop.id, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting || !isAdminOrManager}
                      isLoading={isSubmitting}
                      onClick={() => handleDecision(prop.id, 'approve')}
                    >
                      Approve &amp; bump version
                    </Button>
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
