'use client';

import type { ReviewerOverrideStat } from '@/lib/types';

interface ReviewerOverridesTableProps {
  overrides: ReviewerOverrideStat[];
}

export function ReviewerOverridesTable({ overrides }: ReviewerOverridesTableProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Reviewer Overrides &amp; Dispute Log
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Findings disputed by creators or dismissed by reviewers, grouped by rule with verbatim reasons.
        </p>
      </div>

      {overrides.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No reviewer disputes or dismissals recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Rule Key
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Disputed
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Dismissed
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Total Overrides
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Recorded Reasons
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {overrides.map((row) => (
                <tr key={row.rule_key} className="hover:bg-slate-50/75 align-top">
                  <td className="px-3 py-3 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-800">
                      {row.rule_key}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center font-medium text-amber-700">
                    {row.disputed_count}
                  </td>

                  <td className="px-3 py-3 text-center font-medium text-slate-600">
                    {row.dismissed_count}
                  </td>

                  <td className="px-3 py-3 text-center font-bold text-slate-900">
                    {row.total_overrides}
                  </td>

                  <td className="px-3 py-3 text-slate-700 max-w-md">
                    {row.reasons.length === 0 ? (
                      <span className="text-slate-400 italic">No specific reason logged</span>
                    ) : (
                      <ul className="space-y-1">
                        {row.reasons.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <span className="text-slate-400 select-none">•</span>
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
