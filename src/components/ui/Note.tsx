'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Finding } from '@/lib/types';
import { computeWordDiff } from '@/lib/diff';

export interface NoteProps {
  finding: Finding;
  noteNumber?: number;
  isActive?: boolean;
  onSelect?: () => void;
  onAccept?: (finding: Finding) => void;
  onEditThenAccept?: (finding: Finding) => void;
  onDispute?: (finding: Finding, reason?: string) => void;
  onDismiss?: (findingId: string, reason?: string) => void;
  isProcessingAction?: boolean;
  sourceHashMap?: Record<string, { hash: string; exists: boolean; title?: string }>;
  onReRunReview?: () => void;
}

export function Note({
  finding: f,
  noteNumber,
  isActive = false,
  onSelect,
  onAccept,
  onEditThenAccept,
  onDispute,
  onDismiss,
  isProcessingAction = false,
  sourceHashMap,
  onReRunReview,
}: NoteProps) {
  const [inlineAction, setInlineAction] = React.useState<'dispute' | 'dismiss' | null>(null);
  const [reasonText, setReasonText] = React.useState('');

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

  // Border top color based on severity or needs_human_check
  const topBorderColor = f.needs_human_check
    ? 'border-t-[#5e574c]'
    : f.severity === 'high'
    ? 'border-t-[#b3261e]'
    : f.severity === 'medium'
    ? 'border-t-[#8a5a00]'
    : 'border-t-[#1d4f9c]';

  const labelLine = [
    f.needs_human_check ? 'NEEDS HUMAN CHECK' : f.severity.toUpperCase(),
    f.category.toUpperCase(),
    noteNumber !== undefined ? `NOTE ${noteNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDispute) {
      onDispute(f, reasonText);
      setInlineAction(null);
      setReasonText('');
    }
  };

  const handleDismissSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(f.id, reasonText);
      setInlineAction(null);
      setReasonText('');
    }
  };

  return (
    <article
      id={`note-${f.id}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            onSelect?.();
          }
        }
      }}
      className={`p-4 bg-[#fffdf8] border border-[#ddd5c4] border-t-4 ${topBorderColor} rounded-none transition-opacity duration-120 space-y-3 focus:outline-2 focus:outline-[#1f1c18] focus:outline-offset-2 ${
        isActive
          ? 'ring-2 ring-[#1f1c18] bg-[#fffdf8]'
          : f.status === 'accepted'
          ? 'opacity-60'
          : f.status === 'disputed'
          ? 'opacity-75'
          : f.status === 'dismissed'
          ? 'opacity-40'
          : 'hover:bg-[#f5f1e8]/40'
      }`}
    >
      {/* Top Header: Label line & Status / Origin badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-[11px] font-medium tracking-[0.04em] uppercase text-[#1f1c18]">
          {labelLine}
        </span>

        <div className="flex items-center gap-1.5">
          {f.origin === 'ai' && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-1 py-0.5 border border-[#ddd5c4] text-[#5e574c] bg-[#f5f1e8]">
              AI-assisted
            </span>
          )}
          <Badge variant={f.status}>{f.status}</Badge>
        </div>
      </div>

      {/* Human check alert banner if unverified source */}
      {f.needs_human_check && (
        <div className="p-2.5 bg-[#f5f1e8] border border-[#ddd5c4] text-xs">
          <strong className="font-mono text-[11px] uppercase tracking-[0.04em] block text-[#1f1c18]">
            Needs human check
          </strong>
          <p className="text-[12px] text-[#5e574c] mt-0.5 leading-relaxed">
            This finding could not be cited to an exact library guideline, fact, or term. Human review is required before action.
          </p>
        </div>
      )}

      {/* One-sentence reason */}
      <p className="text-[14px] text-[#1f1c18] leading-[1.55]">
        {f.reason}
      </p>

      {/* Excerpt if present */}
      {f.excerpt && (
        <div className="p-2 bg-[#f5f1e8] border border-[#ddd5c4] text-xs font-mono">
          <span className="text-[10px] uppercase text-[#5e574c] block mb-0.5">
            Excerpt under review:
          </span>
          <span className="text-[#1f1c18] break-words">
            &ldquo;{f.excerpt}&rdquo;
          </span>
        </div>
      )}

      {/* Source Citation Section */}
      {(() => {
        const sourceInfo = f.source_id && sourceHashMap ? sourceHashMap[f.source_id] : null;
        let sourceStatus: 'verified' | 'stale' | 'deleted' | null = null;

        if (f.source_id && sourceHashMap) {
          if (!sourceInfo || !sourceInfo.exists) {
            sourceStatus = 'deleted';
          } else if (f.source_hash && sourceInfo.hash !== f.source_hash) {
            sourceStatus = 'stale';
          } else if (f.quote_verified || (!f.needs_human_check && f.source_quote)) {
            sourceStatus = 'verified';
          }
        } else if (f.quote_verified || (!f.needs_human_check && f.source_quote)) {
          sourceStatus = 'verified';
        }

        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
                  Source ({f.source_type || 'Unspecified'}):
                </span>

                {sourceStatus === 'verified' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#f0f9f3] text-[#1f6b3a] border border-[#1f6b3a]"
                    aria-label="Verified verbatim citation against brand library"
                  >
                    <svg className="w-3 h-3 text-[#1f6b3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Verified verbatim</span>
                  </span>
                )}

                {sourceStatus === 'stale' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#fef9ec] text-[#8a5a00] border border-[#8a5a00]"
                      role="status"
                      aria-label="Source changed since this review"
                    >
                      <svg className="w-3 h-3 text-[#8a5a00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Source changed since this review</span>
                    </span>
                    {onReRunReview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReRunReview();
                        }}
                        className="text-[10px] font-mono uppercase underline text-[#1f1c18] hover:text-[#5e574c] cursor-pointer"
                      >
                        Re-run review
                      </button>
                    )}
                  </div>
                )}

                {sourceStatus === 'deleted' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#fdf2f2] text-[#b3261e] border border-[#b3261e]"
                    role="alert"
                    aria-label="Source no longer exists in library"
                  >
                    <svg className="w-3 h-3 text-[#b3261e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Source no longer exists</span>
                  </span>
                )}
              </div>

              <Link
                href={getLibraryLink(f.source_type)}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] text-[#1f1c18] underline underline-offset-2 hover:text-[#5e574c]"
              >
                Library item
              </Link>
            </div>

            {f.source_quote ? (
              <blockquote className="source-quote pl-3 border-l-2 border-[#1f1c18] text-[15px] leading-relaxed break-words my-1 text-[#1f1c18]">
                &ldquo;{f.source_quote}&rdquo;
              </blockquote>
            ) : (
              <p className="source-quote text-[13px] text-[#5e574c] pl-1">
                No exact quote cited.
              </p>
            )}
          </div>
        );
      })()}

      {/* Suggestion Block: Diff & Intent line */}
      {f.suggestion && (
        <div className="space-y-2 pt-2 border-t border-[#ddd5c4]">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
              Suggested correction
            </span>

            {/* Intent line */}
            {f.intent_check === 'preserved' ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#1f6b3a] bg-[#f0f9f3] px-1.5 py-0.5 border border-[#1f6b3a]">
                <svg className="w-3 h-3 text-[#1f6b3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Intent Preserved</span>
              </span>
            ) : f.intent_check === 'changed' ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#8a5a00] bg-[#fef9ec] px-1.5 py-0.5 border border-[#8a5a00]">
                <svg className="w-3 h-3 text-[#8a5a00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Intent Changed</span>
              </span>
            ) : null}
          </div>

          {/* Monospace Diff Block on #f5f1e8 */}
          <div className="p-3 bg-[#f5f1e8] border border-[#ddd5c4] font-mono text-[12px] leading-relaxed space-y-1">
            <div className="text-[#b3261e] line-through break-words">
              - {f.excerpt || '(original)'}
            </div>
            <div className="text-[#1f6b3a] underline underline-offset-2 break-words">
              + {f.suggestion}
            </div>
          </div>

          {/* What changed: word-level chips */}
          {(() => {
            if (!f.excerpt) return null;
            const diffs = computeWordDiff(f.excerpt, f.suggestion);
            const added = diffs.filter((d) => d.type === 'insert' && d.value.trim().length > 0);
            const removed = diffs.filter((d) => d.type === 'delete' && d.value.trim().length > 0);

            if (added.length === 0 && removed.length === 0) return null;

            return (
              <div className="space-y-1 pt-0.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#5e574c] block">
                  What changed:
                </span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {removed.map((r, i) => (
                    <span
                      key={`rem-${i}`}
                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[#fdf2f2] text-[#b3261e] border border-[#b3261e] line-through"
                    >
                      - {r.value.trim()}
                    </span>
                  ))}
                  {added.map((a, i) => (
                    <span
                      key={`add-${i}`}
                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[#f0f9f3] text-[#1f6b3a] border border-[#1f6b3a]"
                    >
                      + {a.value.trim()}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Intent Reasons / Notes */}
          {Array.isArray(f.intent_reasons) && f.intent_reasons.length > 0 ? (
            <div className="p-2 bg-[#fef9ec] border border-[#8a5a00] text-[11px] font-mono text-[#8a5a00] space-y-0.5">
              <span className="font-semibold block uppercase text-[10px]">Guard analysis:</span>
              {f.intent_reasons.map((r, i) => (
                <div key={i}>• {String(r)}</div>
              ))}
            </div>
          ) : f.intent_note ? (
            <p className="text-[12px] text-[#5e574c] italic">
              Note: {f.intent_note}
            </p>
          ) : null}
        </div>
      )}

      {/* Action Buttons (Accept primary, Edit, Dispute, Dismiss) */}
      {f.status === 'open' && (
        <div className="pt-2 border-t border-[#ddd5c4] space-y-2 print:hidden">
          {inlineAction === null ? (
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {f.suggestion && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    className={
                      f.intent_check === 'changed'
                        ? 'bg-[#8a5a00] hover:bg-[#8a5a00]/90 border-[#8a5a00]'
                        : ''
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept?.(f);
                    }}
                    disabled={isProcessingAction}
                  >
                    {f.intent_check === 'changed' ? 'Accept anyway...' : 'Accept'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditThenAccept?.(f);
                    }}
                    disabled={isProcessingAction}
                  >
                    Edit
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineAction('dispute');
                }}
                disabled={isProcessingAction}
              >
                Dispute
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineAction('dismiss');
                }}
                disabled={isProcessingAction}
              >
                Dismiss
              </Button>
            </div>
          ) : (
            <form
              onSubmit={inlineAction === 'dispute' ? handleDisputeSubmit : handleDismissSubmit}
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-[#f5f1e8] border border-[#ddd5c4] space-y-2"
            >
              <label className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#1f1c18] block">
                Reason for {inlineAction === 'dispute' ? 'dispute' : 'dismissal'}:
              </label>
              <input
                type="text"
                required
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={inlineAction === 'dispute' ? 'State why this finding is inaccurate...' : 'State reason to dismiss...'}
                className="w-full bg-[#fffdf8] border border-[#ddd5c4] px-2.5 py-1.5 text-xs text-[#1f1c18] rounded-none focus:outline-2 focus:outline-[#1f1c18]"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInlineAction(null);
                    setReasonText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!reasonText.trim()}
                >
                  Confirm {inlineAction}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {f.status === 'disputed' && f.dispute_reason && (
        <div className="p-2.5 bg-[#f5f1e8] border border-[#ddd5c4] text-xs">
          <strong className="font-mono text-[11px] uppercase text-[#5e574c] block">
            Dispute reason:
          </strong>
          <p className="text-[#1f1c18] mt-0.5">{f.dispute_reason}</p>
        </div>
      )}
    </article>
  );
}
