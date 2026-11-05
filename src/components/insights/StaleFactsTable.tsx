'use client';

import type { StaleFactStat } from '@/lib/types';

interface StaleFactsTableProps {
  staleFacts: StaleFactStat[];
  expiredFactFindingsCount: number;
}

export function StaleFactsTable({
  staleFacts,
  expiredFactFindingsCount,
}: StaleFactsTableProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Stale &amp; Expiring Clinical Facts</span>
            {expiredFactFindingsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                {expiredFactFindingsCount} findings cited expired facts
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Approved facts that are expired or expiring within 30 days requiring renewal or re-verification.
          </p>
        </div>
      </div>

      {staleFacts.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          All approved brand facts are active with valid expiration dates beyond 30 days.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Approved Fact Statement
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Expiration
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700">
                  Timeline Status
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-slate-700 text-center">
                  Findings Citing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {staleFacts.map((fact) => {
                const isExpired = fact.status === 'expired';
                return (
                  <tr key={fact.fact_id} className="hover:bg-slate-50/75">
                    <td className="px-3 py-3 text-slate-800 font-medium max-w-md">
                      {fact.statement}
                    </td>

                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {fact.expires_at ? new Date(fact.expires_at).toLocaleDateString() : 'None'}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                          <span>⛔</span>
                          <span>Expired ({Math.abs(fact.days_until_expiration)}d ago)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <span>⏳</span>
                          <span>Expires in {fact.days_until_expiration}d</span>
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          fact.cited_in_findings_count > 0 ? 'text-red-600' : 'text-slate-500'
                        }`}
                      >
                        {fact.cited_in_findings_count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
