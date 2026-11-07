'use client';

import React, { useState } from 'react';
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
    <div className="bg-[#fffdf8] p-5 border border-[#ddd5c4] rounded-none space-y-4">
      <div className="flex items-center justify-between border-b border-[#ddd5c4] pb-2">
        <div>
          <h3 className="font-serif text-lg font-medium text-[#1f1c18] flex items-center gap-2">
            <span>Guideline clarification proposals</span>
            {pending.length > 0 && (
              <Badge variant="ai">
                {pending.length} pending
              </Badge>
            )}
          </h3>
          <p className="text-xs text-[#5e574c] mt-0.5">
            AI-suggested wording improvements based on dispute reasons. Approving updates guideline clarification and increments its version.
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

      {pending.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
          No pending clarification proposals. Select &ldquo;Clarify wording&rdquo; in the Guideline Health table above to generate AI proposals.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((prop) => {
            const guideline = prop.guideline_id ? guidelineMap.get(prop.guideline_id) : undefined;
            const isSubmitting = actingId === prop.id;

            return (
              <div
                key={prop.id}
                className="p-4 border border-[#ddd5c4] bg-[#fffdf8] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ddd5c4] pb-2">
                  <div>
                    <span className="font-mono text-[10px] text-[#5e574c] uppercase tracking-[0.04em] block">
                      Target guideline policy
                    </span>
                    <h4 className="font-serif text-base font-medium text-[#1f1c18]">
                      {guideline ? guideline.title : 'General Brand Standard'}
                    </h4>
                  </div>
                  <Badge variant="ai">
                    Pending decision
                  </Badge>
                </div>

                {prop.reason && (
                  <div className="text-xs text-[#5e574c] bg-[#f5f1e8] p-2.5 border border-[#ddd5c4]">
                    <strong className="text-[#1f1c18]">Rationale: </strong>
                    {prop.reason}
                  </div>
                )}

                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] block mb-1">
                    Proposed clarification wording:
                  </span>
                  <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4] text-xs text-[#1f1c18] whitespace-pre-wrap font-mono leading-relaxed">
                    {prop.proposed_text}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#ddd5c4] flex-wrap gap-2">
                  <span className="text-[11px] text-[#5e574c] italic">
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
                      Approve and bump version
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
