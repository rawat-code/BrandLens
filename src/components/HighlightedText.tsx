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
  indexInFindings?: number;
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

    const validSpans: {
      start: number;
      end: number;
      finding: Finding;
      findingIndex: number;
    }[] = [];

    findings.forEach((f, idx) => {
      if (
        typeof f.start_idx === 'number' &&
        typeof f.end_idx === 'number' &&
        f.start_idx >= 0 &&
        f.end_idx <= text.length &&
        f.start_idx < f.end_idx
      ) {
        validSpans.push({
          start: f.start_idx,
          end: f.end_idx,
          finding: f,
          findingIndex: idx + 1,
        });
      } else if (f.excerpt && text.includes(f.excerpt)) {
        let searchIndex = 0;
        let foundIdx: number;
        while ((foundIdx = text.indexOf(f.excerpt, searchIndex)) !== -1) {
          validSpans.push({
            start: foundIdx,
            end: foundIdx + f.excerpt.length,
            finding: f,
            findingIndex: idx + 1,
          });
          searchIndex = foundIdx + f.excerpt.length;
          break; // First occurrence
        }
      }
    });

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
        // Skip overlapping spans
        continue;
      }

      if (span.start > currentIdx) {
        result.push({ text: text.slice(currentIdx, span.start) });
      }

      result.push({
        text: text.slice(span.start, span.end),
        finding: span.finding,
        indexInFindings: span.findingIndex,
        isActive: span.finding.id === activeFindingId,
      });

      currentIdx = span.end;
    }

    if (currentIdx < text.length) {
      result.push({ text: text.slice(currentIdx) });
    }

    return result;
  }, [text, findings, activeFindingId]);

  return (
    <div
      className="p-6 font-sans text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-text text-[#ececf6] bg-[#11111a] rounded-xl border border-white/[0.08] min-h-[360px]"
      tabIndex={0}
      aria-label="Highlighted content text viewer"
    >
      {segments.map((seg, idx) => {
        if (!seg.finding) {
          return <span key={idx}>{seg.text}</span>;
        }

        const f = seg.finding;
        const isActive = seg.isActive;

        // Distinct styling per severity:
        // High: wavy underline in #ff7a8a, tint bg
        // Medium: solid underline in #f5b74f, tint bg
        // Low: dotted underline in #7fb4ff, tint bg
        let styleClass = '';
        let patternLabel = '';

        if (isActive) {
          styleClass =
            'ring-2 ring-indigo-400 bg-indigo-500/20 text-white font-medium rounded px-1';
          patternLabel = 'Active highlight: ';
        } else if (f.severity === 'high') {
          styleClass =
            'bg-[#ff7a8a]/15 text-[#ffd0d6] font-medium underline decoration-wavy decoration-[#ff7a8a] underline-offset-4 px-0.5 rounded-sm hover:bg-[#ff7a8a]/25 transition-colors';
          patternLabel = 'High severity issue (wavy underline): ';
        } else if (f.severity === 'medium') {
          styleClass =
            'bg-[#f5b74f]/15 text-[#fde68a] font-medium underline decoration-solid decoration-[#f5b74f] underline-offset-4 px-0.5 rounded-sm hover:bg-[#f5b74f]/25 transition-colors';
          patternLabel = 'Medium severity issue (solid underline): ';
        } else {
          styleClass =
            'bg-[#7fb4ff]/10 text-[#bfdbfe] underline decoration-dotted decoration-[#7fb4ff] underline-offset-4 px-0.5 rounded-sm hover:bg-[#7fb4ff]/20 transition-colors';
          patternLabel = 'Low severity issue (dotted underline): ';
        }

        if (f.status === 'accepted') {
          styleClass += ' line-through opacity-50';
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
            className={`cursor-pointer inline relative transition-all ${styleClass}`}
          >
            {seg.text}
            {seg.indexInFindings && (
              <sup className="ml-0.5 text-[10px] font-mono font-bold text-inherit opacity-80 select-none">
                [{seg.indexInFindings}]
              </sup>
            )}
          </mark>
        );
      })}
    </div>
  );
}
