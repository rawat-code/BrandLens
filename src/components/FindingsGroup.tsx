'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StaggerContainer, StaggerItem } from '@/components/ui/Motion';
import type { Finding } from '@/lib/types';

interface FindingsGroupProps {
  findings: Finding[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onAcceptFinding: (finding: Finding) => void;
  onEditThenAccept: (finding: Finding) => void;
  onDisputeFinding: (finding: Finding) => void;
  onDismissFinding: (findingId: string) => void;
  isProcessingAction?: boolean;
}

const SEVERITY_ORDER: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];

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
      <div className="text-center py-12 px-5 rounded-xl border border-white/[0.08] bg-[#11111a]">
        <div className="w-10 h-10 rounded-xl bg-[#171724] border border-white/[0.08] flex items-center justify-center text-[#5fd1a0] mx-auto mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#ececf6]">No issues flagged</p>
        <p className="text-xs text-[#a3a3bb] mt-1">
          Click &ldquo;Run review&rdquo; to scan this version against the organization library.
        </p>
      </div>
    );
  }

  // Group findings by severity
  const groupedBySeverity: Record<string, Finding[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const f of findings) {
    if (groupedBySeverity[f.severity]) {
      groupedBySeverity[f.severity].push(f);
    } else {
      groupedBySeverity.low.push(f);
    }
  }

  const getLibraryLink = (sourceType: string | null) => {
    switch (sourceType) {
      case 'guideline':
        return '/library?tab=guidelines';
      case 'fact':
        return '/library?tab=facts';
      case 'term':
        return '/library?tab=terms';
      default:
        return '/library';
    }
  };

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((severity) => {
        const severityFindings = groupedBySeverity[severity];
        if (!severityFindings.length) return null;

        const categories = Array.from(new Set(severityFindings.map((f) => f.category)));

        const severityHeading =
          severity === 'high'
            ? { title: 'High severity', variant: 'high' as const, borderClass: 'border-l-[#ff7a8a]' }
            : severity === 'medium'
            ? { title: 'Medium severity', variant: 'medium' as const, borderClass: 'border-l-[#f5b74f]' }
            : { title: 'Low severity', variant: 'low' as const, borderClass: 'border-l-[#7fb4ff]' };

        return (
          <div key={severity} className="space-y-3">
            {/* Severity Section Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2">
                <Badge variant={severityHeading.variant}>
                  {severityHeading.title} ({severityFindings.length})
                </Badge>
              </div>
            </div>

            {/* Findings under this severity */}
            <div className="space-y-3">
              {categories.map((category) => {
                const categoryFindings = severityFindings.filter((f) => f.category === category);

                return (
                  <div key={category} className="space-y-2.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#7b7b94] block ml-1">
                      {category}
                    </span>

                    <StaggerContainer className="space-y-3">
                      {categoryFindings.map((f) => {
                        const isActive = f.id === activeFindingId;

                        return (
                          <StaggerItem key={f.id}>
                            <div
                              id={`card-${f.id}`}
                              tabIndex={0}
                              onClick={() => onSelectFinding(f.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onSelectFinding(f.id);
                                }
                              }}
                              className={`p-4 rounded-xl border border-white/[0.08] border-l-[3px] ${severityHeading.borderClass} bg-[#11111a] transition-all space-y-3 focus:outline-none ${
                                isActive
                                  ? 'ring-1 ring-indigo-400 bg-[#171724]/90 shadow-xl shadow-indigo-950/40'
                                  : f.status === 'accepted'
                                  ? 'opacity-60 bg-[#11111a]/70'
                                  : f.status === 'disputed'
                                  ? 'opacity-70 bg-[#11111a]/80'
                                  : f.status === 'dismissed'
                                  ? 'opacity-40 bg-[#11111a]/50'
                                  : 'hover:bg-[#171724]/50'
                              }`}
                            >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={severityHeading.variant}>
                                {f.severity}
                              </Badge>

                              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#171724] text-[#a3a3bb] border border-white/[0.06]">
                                {f.category}
                              </span>

                              {f.origin === 'ai' && (
                                <Badge variant="ai">
                                  AI-assisted
                                </Badge>
                              )}
                            </div>

                            {/* Status Badge */}
                            <Badge
                              variant={
                                f.status === 'accepted'
                                  ? 'success'
                                  : f.status === 'disputed'
                                  ? 'medium'
                                  : f.status === 'dismissed'
                                  ? 'neutral'
                                  : 'neutral'
                              }
                            >
                              {f.status}
                            </Badge>
                          </div>

                          {/* "Needs human check" (Rule 1) */}
                          {f.needs_human_check && (
                            <div className="p-3 rounded-lg bg-[#f5b74f]/10 border border-[#f5b74f]/30 text-[#fde68a] text-xs flex items-start gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f5b74f] shrink-0 mt-1" />
                              <div>
                                <strong className="font-medium text-[#ececf6] block">Needs human check</strong>
                                <span className="text-[#a3a3bb] text-[11px] leading-relaxed">
                                  This issue could not be definitively cited to an exact library guideline or fact. Human review is required before taking action.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Reason */}
                          <p className="text-xs sm:text-[13px] text-[#ececf6] leading-relaxed">
                            {f.reason}
                          </p>

                          {/* Excerpt with Click to Highlight */}
                          {f.excerpt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectFinding(f.id);
                              }}
                              className="w-full text-left p-3 rounded-lg bg-[#0c0c14] hover:bg-[#151522] transition-colors text-xs font-mono text-[#ececf6] block border border-white/[0.06] group cursor-pointer"
                              title="Click to focus in editor"
                            >
                              <span className="text-[10px] font-mono uppercase text-[#7b7b94] block mb-1 group-hover:text-indigo-300">
                                Excerpt under review:
                              </span>
                              &ldquo;{f.excerpt}&rdquo;
                            </button>
                          )}

                          {/* Source Section with link to library item */}
                          <div className="p-3 rounded-lg bg-[#0c0c14] border border-white/[0.06] text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[#a3a3bb] capitalize text-[11px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>Source ({f.source_type || 'Unspecified'}):</span>
                              </span>

                              <Link
                                href={getLibraryLink(f.source_type)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-[#a5b4fc] hover:underline font-medium"
                              >
                                View in library ↗
                              </Link>
                            </div>

                            {f.source_quote ? (
                              <blockquote className="text-[#ececf6] pl-3 border-l-2 border-indigo-400 font-mono text-xs leading-relaxed italic break-words my-1.5">
                                &ldquo;{f.source_quote}&rdquo;
                              </blockquote>
                            ) : (
                              <span className="italic text-[#7b7b94] text-[11px] block pl-1">
                                No exact quote cited (requires human verification).
                              </span>
                            )}

                            {typeof f.confidence === 'number' && (
                              <div className="pt-1 text-[10px] text-[#7b7b94] font-mono border-t border-white/[0.04]">
                                Confidence: {Math.round(f.confidence * 100)}%
                              </div>
                            )}
                          </div>

                          {/* Suggestion Block: Diff & Intent badge */}
                          {f.suggestion && (
                            <div className="p-3.5 rounded-xl bg-[#0c0c14] border border-[#5fd1a0]/30 space-y-2.5">
                              {/* Header & Intent Badge */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-medium text-[#5fd1a0] uppercase tracking-wide">
                                  Suggested fix
                                </span>

                                {f.intent_check === 'preserved' ? (
                                  <Badge variant="success">
                                    Meaning preserved
                                  </Badge>
                                ) : f.intent_check === 'changed' ? (
                                  <Badge variant="medium">
                                    Meaning may have changed
                                  </Badge>
                                ) : null}
                              </div>

                              {/* Diff View */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                  <span className="text-[10px] uppercase font-mono text-[#ff7a8a] block mb-1">
                                    Original
                                  </span>
                                  <span className="font-mono text-xs text-[#ff7a8a] line-through leading-relaxed break-words block">
                                    {f.excerpt || '(Unspecified)'}
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <span className="text-[10px] uppercase font-mono text-[#5fd1a0] block mb-1">
                                    Suggested
                                  </span>
                                  <span className="font-mono text-xs text-[#5fd1a0] font-medium underline underline-offset-2 leading-relaxed break-words block">
                                    {f.suggestion}
                                  </span>
                                </div>
                              </div>

                              {/* Intent Note */}
                              {f.intent_note && (
                                <p className="text-[11px] text-[#a3a3bb] italic leading-snug pt-1">
                                  Note: {f.intent_note}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action Buttons (Rule 2: AI suggests, humans decide) */}
                          {f.status === 'open' && (
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06] flex-wrap">
                              {f.suggestion && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAcceptFinding(f);
                                    }}
                                    disabled={isProcessingAction}
                                  >
                                    Accept
                                  </Button>

                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditThenAccept(f);
                                    }}
                                    disabled={isProcessingAction}
                                  >
                                    Edit then accept
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDisputeFinding(f);
                                }}
                                disabled={isProcessingAction}
                                className="text-[#f5b74f] hover:text-[#fde68a]"
                              >
                                Dispute
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissFinding(f.id);
                                }}
                                disabled={isProcessingAction}
                                className="text-[#7b7b94] hover:text-[#a3a3bb]"
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}

                          {f.status === 'disputed' && f.dispute_reason && (
                            <div className="p-2.5 rounded-lg bg-[#f5b74f]/10 text-[#fde68a] text-xs border border-[#f5b74f]/20">
                              <strong className="block text-[11px] font-mono uppercase text-[#a3a3bb]">Dispute reason:</strong>
                              <p className="mt-0.5 text-[#ececf6]">{f.dispute_reason}</p>
                            </div>
                          )}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
