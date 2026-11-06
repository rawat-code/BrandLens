'use client';

import { Badge } from '@/components/ui/Badge';
import type { StaleFactStat } from '@/lib/types';

interface StaleFactsTableProps {
  staleFacts: StaleFactStat[];
  expiredFactFindingsCount?: number;
}

export function StaleFactsTable({
  staleFacts,
  expiredFactFindingsCount = 0,
}: StaleFactsTableProps) {
  return (
    <div className="bg-[#11111a] p-5 rounded-xl border border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-[#ececf6] flex items-center gap-2">
            <span>Stale &amp; expiring clinical facts</span>
            {expiredFactFindingsCount > 0 && (
              <Badge variant="high">
                {expiredFactFindingsCount} findings cited expired facts
              </Badge>
            )}
          </h3>
          <p className="text-xs text-[#a3a3bb] mt-0.5">
            Approved facts that are expired or expiring within 30 days requiring renewal or re-verification.
          </p>
        </div>
      </div>

      {staleFacts.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7b7b94] italic bg-[#171724] rounded-lg border border-dashed border-white/[0.06]">
          All approved brand facts are active with valid expiration dates beyond 30 days.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171724] text-[#a3a3bb] font-mono uppercase text-[10px] border-b border-white/[0.06]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Approved fact statement
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Expiration
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Timeline status
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center">
                  Findings citing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[#ececf6]">
              {staleFacts.map((fact) => {
                const isExpired = fact.status === 'expired';
                return (
                  <tr key={fact.fact_id} className="hover:bg-[#171724]/60">
                    <td className="px-3.5 py-3 font-mono text-xs max-w-md">
                      {fact.statement}
                    </td>

                    <td className="px-3.5 py-3 text-[#a3a3bb] font-mono whitespace-nowrap">
                      {fact.expires_at ? new Date(fact.expires_at).toLocaleDateString() : 'None'}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {isExpired ? (
                        <Badge variant="high">
                          Expired ({Math.abs(fact.days_until_expiration)}d ago)
                        </Badge>
                      ) : (
                        <Badge variant="medium">
                          Expires in {fact.days_until_expiration}d
                        </Badge>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono">
                      <span
                        className={
                          fact.cited_in_findings_count > 0 ? 'text-[#ff7a8a] font-medium' : 'text-[#7b7b94]'
                        }
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
