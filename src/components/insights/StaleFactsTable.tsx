'use client';

import React from 'react';
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
    <div className="bg-[#fffdf8] p-5 border border-[#ddd5c4] rounded-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#ddd5c4] pb-2">
        <div>
          <h3 className="font-serif text-lg font-medium text-[#1f1c18] flex items-center gap-2">
            <span>Stale and expiring clinical facts</span>
            {expiredFactFindingsCount > 0 && (
              <Badge variant="high">
                {expiredFactFindingsCount} citing expired
              </Badge>
            )}
          </h3>
          <p className="text-xs text-[#5e574c] mt-0.5">
            Approved facts that are expired or expiring within 30 days requiring renewal or re-verification.
          </p>
        </div>
      </div>

      {staleFacts.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e574c] italic bg-[#f5f1e8] border border-[#ddd5c4]">
          All approved brand facts are active with valid expiration dates beyond 30 days.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#ddd5c4] bg-[#fffdf8]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#fffdf8] text-[#5e574c] font-mono uppercase text-[10px] tracking-[0.04em] border-b border-[#ddd5c4]">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Approved fact statement
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium font-mono">
                  Expiration
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium">
                  Timeline status
                </th>
                <th scope="col" className="px-3.5 py-2.5 font-medium text-center font-mono">
                  Findings citing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ddd5c4] text-[#1f1c18]">
              {staleFacts.map((fact) => {
                const isExpired = fact.status === 'expired';
                return (
                  <tr key={fact.fact_id} className="hover:bg-[#f5f1e8] transition-colors duration-120">
                    <td className="px-3.5 py-3 font-mono text-xs max-w-md">
                      {fact.statement}
                    </td>

                    <td className="px-3.5 py-3 text-[#5e574c] font-mono whitespace-nowrap">
                      {fact.expires_at ? new Date(fact.expires_at).toLocaleDateString() : 'None'}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {isExpired ? (
                        <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#fffdf8] border border-[#b3261e] text-[#b3261e]">
                          Expired ({fact.expires_at ? new Date(fact.expires_at).toLocaleDateString() : ''})
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#f6e3b4] border border-[#8a5a00] text-[#8a5a00]">
                          Expiring soon ({fact.days_until_expiration}d)
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-center font-mono font-medium text-[#1f1c18]">
                      {fact.cited_in_findings_count}
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
