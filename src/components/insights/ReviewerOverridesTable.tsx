'use client';

import React from 'react';
import type { ReviewerOverrideStat } from '@/lib/types';

interface ReviewerOverridesTableProps {
  overrides: ReviewerOverrideStat[];
}

export function ReviewerOverridesTable({ overrides }: ReviewerOverridesTableProps) {
  return (
    <div className="bg-[#fffdf8] p-5 border border-[#ddd5c4] rounded-none space-y-4">
      <div className="border-b border-[#ddd5c4] pb-2">
        <h3 className="font-serif text-lg font-medium text-[#1f1c18]">
          Reviewer overrides and dispute log
        </h3>
        <p className="text-xs text-[#5e574c] mt-0.5">
          Findings disputed by creators or dismissed by reviewers, grouped by rule with verbatim reasons.
        </p>
      </div>

      {overrides.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
          No reviewer disputes or dismissals recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#ddd5c4] bg-[#fffdf8]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#fffdf8] text-[#5e574c] font-mono uppercase text-[10px] tracking-[0.04em] border-b border-[#ddd5c4]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Rule key
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Disputed
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Dismissed
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Overrides
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Recorded reasons
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ddd5c4] text-[#1f1c18]">
              {overrides.map((row) => (
                <tr key={row.rule_key} className="hover:bg-[#f5f1e8] transition-colors duration-120 align-top">
                  <td className="px-3.5 py-3 font-mono font-medium">
                    <span className="bg-[#f5f1e8] px-1.5 py-0.5 border border-[#ddd5c4] text-[#1f1c18]">
                      {row.rule_key}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono text-[#8a5a00]">
                    {row.disputed_count}
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono text-[#5e574c]">
                    {row.dismissed_count}
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono font-medium text-[#1f1c18]">
                    {row.total_overrides}
                  </td>

                  <td className="px-3.5 py-3 max-w-md">
                    {row.reasons.length === 0 ? (
                      <span className="text-[#5e574c] italic">No specific reason logged</span>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {row.reasons.slice(0, 3).map((r, i) => (
                          <li key={i} className="text-[#5e574c] flex items-start gap-1.5">
                            <span className="text-[#1f1c18]">•</span>
                            <span className="italic">&ldquo;{r}&rdquo;</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
