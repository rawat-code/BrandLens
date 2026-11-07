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
  noteNumber?: number;
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

    // Map each finding to a 1-based note number
    const noteMap = new Map<string, number>();
    findings.forEach((f, idx) => {
      noteMap.set(f.id, idx + 1);
    });

    const validSpans: {
      start: number;
      end: number;
      finding: Finding;
      noteNumber: number;
    }[] = [];

    findings.forEach((f) => {
      const noteNum = noteMap.get(f.id) || 1;
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
          noteNumber: noteNum,
        });
      } else if (f.excerpt && text.includes(f.excerpt)) {
        let searchIndex = 0;
        let foundIdx: number;
        while ((foundIdx = text.indexOf(f.excerpt, searchIndex)) !== -1) {
          validSpans.push({
            start: foundIdx,
            end: foundIdx + f.excerpt.length,
            finding: f,
            noteNumber: noteNum,
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
        // Skip overlapping span
        continue;
      }

      if (span.start > currentIdx) {
        result.push({ text: text.slice(currentIdx, span.start) });
      }

      result.push({
        text: text.slice(span.start, span.end),
        finding: span.finding,
        noteNumber: span.noteNumber,
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
      className="p-[34px] sm:px-[38px] sm:py-[34px] font-serif text-[24px] leading-[2.1] whitespace-pre-wrap select-text text-[#1f1c18] bg-[#fffdf8] border border-[#ddd5c4] rounded-none min-h-[420px] focus:outline-2 focus:outline-[#1f1c18] focus:outline-offset-2"
      tabIndex={0}
      aria-label="Reading text with proofreader margin notes"
    >
      {segments.map((seg, idx) => {
        if (!seg.finding) {
          return <span key={idx}>{seg.text}</span>;
        }

        const f = seg.finding;
        const isActive = seg.isActive;

        // Redline styling:
        // high: 2px solid red underline (#b3261e)
        // medium: highlighter background #f6e3b4
        // low: 2px dotted blue underline (#1d4f9c)
        let underlineClass = '';
        if (f.severity === 'high') {
          underlineClass = 'underline decoration-[#b3261e] decoration-2 underline-offset-4';
        } else if (f.severity === 'medium') {
          underlineClass = 'bg-[#f6e3b4] text-[#8a5a00] px-1';
        } else {
          underlineClass = 'underline decoration-[#1d4f9c] decoration-2 decoration-dotted underline-offset-4';
        }

        if (isActive) {
          underlineClass += ' ring-2 ring-[#1f1c18] ring-offset-2';
        }

        if (f.status === 'accepted') {
          underlineClass += ' line-through opacity-50';
        }

        return (
          <span key={idx} className="inline">
            <mark
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
              className={`cursor-pointer inline bg-transparent transition-opacity duration-120 ${underlineClass}`}
            >
              {seg.text}
            </mark>
            {seg.noteNumber !== undefined && (
              <sup className="align-super ml-0.5">
                <button
                  type="button"
                  onClick={() => onSelectFinding(f.id)}
                  aria-label={`Jump to note ${seg.noteNumber}`}
                  className="font-mono text-[11px] font-semibold text-[#1f1c18] hover:underline cursor-pointer select-none inline-block px-0.5"
                >
                  {seg.noteNumber}
                </button>
              </sup>
            )}
          </span>
        );
      })}
    </div>
  );
}
