'use client';

import type { ReviewerOverrideStat } from '@/lib/types';

interface ReviewerOverridesTableProps {
  overrides: ReviewerOverrideStat[];
}

export function ReviewerOverridesTable({ overrides }: ReviewerOverridesTableProps) {
  return (
    <div className="bg-[#11111a] p-5 rounded-xl border border-white/[0.08] space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[#ececf6]">
          Reviewer overrides &amp; dispute log
        </h3>
        <p className="text-xs text-[#a3a3bb] mt-0.5">
          Findings disputed by creators or dismissed by reviewers, grouped by rule with verbatim reasons.
        </p>
      </div>

      {overrides.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7b7b94] italic bg-[#171724] rounded-lg border border-dashed border-white/[0.06]">
          No reviewer disputes or dismissals recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171724] text-[#a3a3bb] font-mono uppercase text-[10px] border-b border-white/[0.06]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Rule key
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Disputed
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Dismissed
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Overrides
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Recorded reasons
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[#ececf6]">
              {overrides.map((row) => (
                <tr key={row.rule_key} className="hover:bg-[#171724]/60 align-top">
                  <td className="px-3.5 py-3 font-mono font-medium">
                    <span className="bg-[#171724] px-2 py-0.5 rounded border border-white/[0.06] text-[#a5b4fc]">
                      {row.rule_key}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono text-[#f5b74f]">
                    {row.disputed_count}
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono text-[#a3a3bb]">
                    {row.dismissed_count}
                  </td>

                  <td className="px-3.5 py-3 text-center font-mono font-medium text-[#ececf6]">
                    {row.total_overrides}
                  </td>

                  <td className="px-3.5 py-3 max-w-md">
                    {row.reasons.length === 0 ? (
                      <span className="text-[#7b7b94] italic">No specific reason logged</span>
                    ) : (
                      <ul className="space-y-1">
                        {row.reasons.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-[#a3a3bb]">
                            <span className="text-[#7b7b94] select-none">•</span>
                            <span className="italic font-mono text-[11px]">&ldquo;{r}&rdquo;</span>
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
