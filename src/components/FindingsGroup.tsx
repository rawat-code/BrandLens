'use client';

import React from 'react';
import Link from 'next/link';
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
      <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <svg className="w-10 h-10 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs font-bold text-slate-800">No issues flagged</p>
        <p className="text-xs text-slate-500 mt-1">
          Click &ldquo;Run Review&rdquo; to scan this version against the organization library.
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

        // Sub-group by category
        const categories = Array.from(new Set(severityFindings.map((f) => f.category)));

        const severityHeading =
          severity === 'high'
            ? { title: 'High Severity', icon: '🚨', pattern: 'Dashed Red Underline', badgeClass: 'bg-rose-100 text-rose-900 border-rose-300' }
            : severity === 'medium'
            ? { title: 'Medium Severity', icon: '⚡', pattern: 'Dotted Amber Underline', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' }
            : { title: 'Low Severity', icon: 'ℹ️', pattern: 'Solid Blue Underline', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' };

        return (
          <div key={severity} className="space-y-3">
            {/* Severity Section Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm" aria-hidden="true">{severityHeading.icon}</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {severityHeading.title} ({severityFindings.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                {severityHeading.pattern}
              </span>
            </div>

            {/* Findings under this severity */}
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryFindings = severityFindings.filter((f) => f.category === category);

                return (
                  <div key={category} className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block ml-1">
                      Category: {category}
                    </span>

                    {categoryFindings.map((f) => {
                      const isActive = f.id === activeFindingId;

                      return (
                        <div
                          key={f.id}
                          id={`card-${f.id}`}
                          tabIndex={0}
                          onClick={() => onSelectFinding(f.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectFinding(f.id);
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            isActive
                              ? 'ring-2 ring-emerald-500 bg-emerald-50/30 border-emerald-300 shadow-md'
                              : f.status === 'accepted'
                              ? 'bg-emerald-50/20 border-emerald-200 opacity-75'
                              : f.status === 'disputed'
                              ? 'bg-amber-50/20 border-amber-200 opacity-80'
                              : f.status === 'dismissed'
                              ? 'bg-slate-50 border-slate-200 opacity-50'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Severity Badge with Icon + Text */}
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border flex items-center gap-1 ${severityHeading.badgeClass}`}
                              >
                                <span>{severityHeading.icon}</span>
                                <span>{f.severity}</span>
                              </span>

                              {/* Category Badge */}
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                                {f.category}
                              </span>

                              {/* AI Origin Badge */}
                              {f.origin === 'ai' && (
                                <span
                                  className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1"
                                  title="Grounded finding produced by Gemini AI review"
                                >
                                  <span>✨</span>
                                  <span>AI-assisted review</span>
                                </span>
                              )}
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                f.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : f.status === 'disputed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : f.status === 'dismissed'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {f.status}
                            </span>
                          </div>

                          {/* "Needs human check" prominent styling (Rule 1) */}
                          {f.needs_human_check && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border-2 border-dashed border-amber-400 text-amber-900 text-xs flex items-start gap-2">
                              <span className="text-base leading-none">⚠️</span>
                              <div>
                                <strong className="font-bold block">Needs human check</strong>
                                <span className="text-amber-800 text-[11px]">
                                  This issue could not be definitively cited to an exact library guideline or fact. Human review is required before taking action.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Reason */}
                          <p className="text-xs text-slate-800 leading-relaxed font-normal">
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
                              className="w-full text-left p-2 rounded bg-slate-100/80 hover:bg-slate-200/80 transition-colors text-xs font-mono text-slate-700 block border border-slate-200 group"
                              title="Click to view and highlight in text editor"
                            >
                              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 group-hover:text-emerald-700">
                                Excerpt (click to focus):
                              </span>
                              &ldquo;{f.excerpt}&rdquo;
                            </button>
                          )}

                          {/* Source Section with link to library item */}
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700 capitalize flex items-center gap-1 text-[11px]">
                                <span>{f.source_type === 'guideline' ? '📜' : f.source_type === 'fact' ? '🔬' : '📖'}</span>
                                <span>Source ({f.source_type || 'Unspecified'}):</span>
                              </span>

                              <Link
                                href={getLibraryLink(f.source_type)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline"
                              >
                                Open Library ↗
                              </Link>
                            </div>

                            {f.source_quote ? (
                              <blockquote className="italic text-slate-800 pl-2 border-l-2 border-emerald-500 font-serif text-xs">
                                &ldquo;{f.source_quote}&rdquo;
                              </blockquote>
                            ) : (
                              <span className="italic text-slate-500 text-[11px] block">
                                No exact quote cited (requires human verification).
                              </span>
                            )}

                            {typeof f.confidence === 'number' && (
                              <div className="pt-1 text-[10px] text-slate-500 font-mono">
                                Confidence: {Math.round(f.confidence * 100)}%
                              </div>
                            )}
                          </div>

                          {/* Suggestion Block: Side-by-side comparison & Intent badge */}
                          {f.suggestion && (
                            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                              {/* Header & Intent Badge */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                  Suggested Fix
                                </span>

                                {f.intent_check === 'preserved' ? (
                                  <span
                                    className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-200/70 text-emerald-900 border border-emerald-300 flex items-center gap-1"
                                    title={f.intent_note || 'Suggestion preserves the author intent'}
                                  >
                                    <span>✓</span>
                                    <span>Meaning preserved</span>
                                  </span>
                                ) : f.intent_check === 'changed' ? (
                                  <span
                                    className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-200/80 text-amber-950 border border-amber-300 flex items-center gap-1"
                                    title={f.intent_note || 'Suggestion may alter author meaning'}
                                  >
                                    <span>⚠️</span>
                                    <span>Meaning may have changed</span>
                                  </span>
                                ) : null}
                              </div>

                              {/* Side-by-Side Original vs Suggestion */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded bg-white/80 border border-rose-200">
                                  <span className="text-[10px] uppercase font-bold text-rose-700 block mb-0.5">
                                    Original
                                  </span>
                                  <span className="font-mono text-rose-950 break-words">
                                    {f.excerpt || '(Unspecified)'}
                                  </span>
                                </div>

                                <div className="p-2 rounded bg-white/80 border border-emerald-300">
                                  <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">
                                    Suggested
                                  </span>
                                  <span className="font-mono text-emerald-950 font-semibold break-words">
                                    {f.suggestion}
                                  </span>
                                </div>
                              </div>

                              {/* Intent Note */}
                              {f.intent_note && (
                                <p className="text-[11px] text-emerald-900 italic leading-snug">
                                  Note: {f.intent_note}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action Buttons (Rule 2: AI suggests, humans decide) */}
                          {f.status === 'open' && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                              {f.suggestion && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAcceptFinding(f);
                                    }}
                                    disabled={isProcessingAction}
                                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                  >
                                    Accept
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditThenAccept(f);
                                    }}
                                    disabled={isProcessingAction}
                                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                  >
                                    Edit then accept
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDisputeFinding(f);
                                }}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100/70 border border-amber-300 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                              >
                                Dispute
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissFinding(f.id);
                                }}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}

                          {f.status === 'disputed' && f.dispute_reason && (
                            <div className="p-2 rounded bg-amber-50 text-amber-900 text-xs border border-amber-200">
                              <strong className="block text-[11px] font-bold">Dispute Reason:</strong>
                              <p className="mt-0.5">{f.dispute_reason}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
