'use client';

import React from 'react';
import { Note } from '@/components/ui/Note';
import type { Finding } from '@/lib/types';

interface FindingsGroupProps {
  findings: Finding[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onAcceptFinding: (finding: Finding) => void;
  onEditThenAccept: (finding: Finding) => void;
  onDisputeFinding: (finding: Finding, reason?: string) => void;
  onDismissFinding: (findingId: string, reason?: string) => void;
  isProcessingAction?: boolean;
}

export function FindingsGroup({
  findings,
  activeFindingId,
  onSelectFinding,
  onAcceptFinding,
  onEditThenAccept,
  onDisputeFinding,
  onDismissFinding,
  isProcessingAction,
}: FindingsGroupProps) {
  if (!findings.length) {
    return (
      <div className="p-8 text-center bg-[#fffdf8] border border-[#ddd5c4] rounded-none">
        <p className="font-serif text-lg text-[#1f1c18]">No issues flagged</p>
        <p className="text-xs text-[#5e574c] mt-1">
          Select &ldquo;Run review&rdquo; to scan this version against the organization library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((f, idx) => (
        <Note
          key={f.id}
          finding={f}
          noteNumber={idx + 1}
          isActive={f.id === activeFindingId}
          onSelect={() => onSelectFinding(f.id)}
          onAccept={onAcceptFinding}
          onEditThenAccept={onEditThenAccept}
          onDispute={onDisputeFinding}
          onDismiss={onDismissFinding}
          isProcessingAction={isProcessingAction}
        />
      ))}
    </div>
  );
}
