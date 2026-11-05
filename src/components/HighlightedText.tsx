'use client';

import React, { useMemo } from 'react';
import type { Finding } from '@/lib/types';

interface HighlightedTextProps {
  text: string;
  findings: Finding[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}

interface TextSegment {
  text: string;
  finding?: Finding;
  isActive?: boolean;
}

export function HighlightedText({
  text,
  findings,
  activeFindingId,
  onSelectFinding,
}: HighlightedTextProps) {
  // Build non-overlapping highlight segments
  const segments = useMemo(() => {
    if (!text || !findings.length) {
      return [{ text }];
    }

    // Only highlight open findings (or findings matching excerpts)
    const validSpans: { start: number; end: number; finding: Finding }[] = [];

    for (const f of findings) {
      if (typeof f.start_idx === 'number' && typeof f.end_idx === 'number' && f.start_idx >= 0 && f.end_idx <= text.length && f.start_idx < f.end_idx) {
        validSpans.push({ start: f.start_idx, end: f.end_idx, finding: f });
      } else if (f.excerpt && text.includes(f.excerpt)) {
        let searchIndex = 0;
        let foundIdx: number;
        while ((foundIdx = text.indexOf(f.excerpt, searchIndex)) !== null && foundIdx !== -1) {
          validSpans.push({ start: foundIdx, end: foundIdx + f.excerpt.length, finding: f });
          searchIndex = foundIdx + f.excerpt.length;
          break; // Use first occurrence
        }
      }
    }

    if (!validSpans.length) {
      return [{ text }];
    }

    // Sort spans by start index, prioritizing higher severity
    const severityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    validSpans.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (severityRank[b.finding.severity] || 0) - (severityRank[a.finding.severity] || 0);
    });

    const result: TextSegment[] = [];
    let currentIdx = 0;

    for (const span of validSpans) {
      if (span.start < currentIdx) {
        // Overlapping span; skip to keep clean non-nesting segments
        continue;
      }

      // Plain text before the highlighted span
      if (span.start > currentIdx) {
        result.push({ text: text.slice(currentIdx, span.start) });
      }

      // Highlighted segment
      result.push({
        text: text.slice(span.start, span.end),
        finding: span.finding,
        isActive: span.finding.id === activeFindingId,
      });

      currentIdx = span.end;
    }

    // Remaining text after last span
    if (currentIdx < text.length) {
      result.push({ text: text.slice(currentIdx) });
    }

    return result;
  }, [text, findings, activeFindingId]);

  return (
    <div
      className="p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap select-text text-slate-800 bg-slate-50/40 rounded-xl border border-slate-200 min-h-[300px]"
      tabIndex={0}
      aria-label="Highlighted content text viewer"
    >
      {segments.map((seg, idx) => {
        if (!seg.finding) {
          return <span key={idx}>{seg.text}</span>;
        }

        const f = seg.finding;
        const isActive = seg.isActive;

        // Distinct patterns per severity:
        // High: Red wavy / thick dashed border-b-2
        // Medium: Amber dotted border-b-2
        // Low: Blue solid border-b
        // Active: Ring-2 emerald focus ring
        let styleClass = '';
        let patternLabel = '';

        if (isActive) {
          styleClass =
            'ring-2 ring-emerald-500 bg-emerald-100/90 text-emerald-950 font-bold border-b-2 border-emerald-600 rounded px-1';
          patternLabel = 'Active highlight: ';
        } else if (f.severity === 'high') {
          styleClass =
            'bg-rose-50/80 text-rose-950 font-semibold border-b-2 border-dashed border-rose-500 px-0.5 rounded-sm hover:bg-rose-100 transition-colors';
          patternLabel = 'High severity issue (dashed underline): ';
        } else if (f.severity === 'medium') {
          styleClass =
            'bg-amber-50/80 text-amber-950 font-medium border-b-2 border-dotted border-amber-500 px-0.5 rounded-sm hover:bg-amber-100 transition-colors';
          patternLabel = 'Medium severity issue (dotted underline): ';
        } else {
          styleClass =
            'bg-blue-50/70 text-blue-950 border-b border-solid border-blue-400 px-0.5 rounded-sm hover:bg-blue-100 transition-colors';
          patternLabel = 'Low severity issue (solid underline): ';
        }

        if (f.status === 'accepted') {
          styleClass += ' line-through opacity-60';
        }

        return (
          <mark
            key={idx}
            id={`excerpt-${f.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelectFinding(f.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFinding(f.id);
              }
            }}
            title={`${f.severity.toUpperCase()} (${f.category}): ${f.reason}`}
            aria-label={`${patternLabel}${f.excerpt}. ${f.reason}`}
            className={`cursor-pointer inline ${styleClass}`}
          >
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
