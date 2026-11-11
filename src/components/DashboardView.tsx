'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StartHereCard } from '@/components/StartHereCard';
import { formatTimestamp } from '@/lib/time';
import type { Content, Profile } from '@/lib/types';

interface ReviewQueueItem extends Content {
  highSevCount: number;
  medSevCount?: number;
  lowSevCount?: number;
  totalFindings: number;
}

interface DashboardViewProps {
  initialContents: Content[];
  reviewQueue: ReviewQueueItem[];
  profile: Profile;
  canCreate: boolean;
  isCreator: boolean;
  isApprover: boolean;
}

export function DashboardView({
  initialContents,
  reviewQueue,
  profile,
  canCreate,
  isCreator,
  isApprover,
}: DashboardViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const counts = useMemo(() => {
    const drafts = initialContents.filter((c) => c.status === 'draft' || c.status === 'ai_reviewed').length;
    const inReview = initialContents.filter((c) => c.status === 'in_review').length;
    const approved = initialContents.filter((c) => c.status === 'approved' || c.status === 'published').length;

    return {
      drafts,
      inReview,
      approved,
      total: initialContents.length,
    };
  }, [initialContents]);

  const filteredContents = useMemo(() => {
    return initialContents.filter((item) => {
      // Status filter
      if (filter === 'drafts' && item.status !== 'draft' && item.status !== 'ai_reviewed') return false;
      if (filter === 'in_review' && item.status !== 'in_review') return false;
      if (filter === 'needs_changes' && item.status !== 'needs_changes') return false;
      if (filter === 'approved' && item.status !== 'approved' && item.status !== 'published') return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesChannel = item.channel?.toLowerCase().includes(q);
        const matchesAudience = item.audience?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesChannel && !matchesAudience) return false;
      }

      return true;
    });
  }, [initialContents, filter, search]);

  const pageTitle = isCreator ? 'Content' : 'Review queue';
  const metaCounts = `${counts.drafts} drafts, ${counts.inReview} awaiting review, ${counts.approved} approved`;

  return (
    <div className="space-y-8">
      {/* Page Header (Newsreader title + meta line of counts, no stat cards) */}
      <PageHeader
        title={pageTitle}
        description={metaCounts}
        actions={
          canCreate ? (
            <Link href="/content/new">
              <Button variant="primary" size="md">
                New content
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Role-Aware Getting Started Guide */}
      <StartHereCard role={profile.role} />

      {/* Review Queue (For Managers & Reviewers) */}
      {isApprover && reviewQueue.length > 0 && (
        <section aria-labelledby="review-queue-heading" className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-[#ddd5c4] pb-2">
            <h2 id="review-queue-heading" className="font-serif text-[22px] font-medium text-[#1f1c18]">
              Awaiting review
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c]">
              {reviewQueue.length} {reviewQueue.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="border border-[#ddd5c4] bg-[#fffdf8] overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] sticky top-14 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Title and channel</th>
                  <th scope="col" className="px-5 py-3 font-medium">Open findings</th>
                  <th scope="col" className="px-5 py-3 font-medium">Version</th>
                  <th scope="col" className="px-5 py-3 font-medium">Confidential</th>
                  <th scope="col" className="px-5 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {reviewQueue.map((item) => {
                  const updatedTs = formatTimestamp(item.updated_at || item.created_at);

                  // Format severity summary (e.g., "1 high, 2 medium")
                  const severityParts: string[] = [];
                  if (item.highSevCount > 0) severityParts.push(`${item.highSevCount} high`);
                  if (item.medSevCount && item.medSevCount > 0) severityParts.push(`${item.medSevCount} medium`);
                  if (item.lowSevCount && item.lowSevCount > 0) severityParts.push(`${item.lowSevCount} low`);
                  const severitySummary = severityParts.length > 0 ? severityParts.join(', ') : 'No open issues';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#f5f1e8] transition-colors duration-120"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/content/${item.id}`}
                          className="font-medium text-[#1f1c18] hover:underline line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <div className="text-xs text-[#5e574c] mt-0.5">
                          <span className="capitalize">{item.channel}</span>
                          {item.audience && <span> · {item.audience}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-mono text-[12px] ${
                            item.highSevCount > 0
                              ? 'text-[#b3261e] font-medium'
                              : item.medSevCount && item.medSevCount > 0
                              ? 'text-[#8a5a00]'
                              : 'text-[#5e574c]'
                          }`}
                        >
                          {severitySummary}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#5e574c]">
                        v{item.current_version}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.confidential ? (
                          <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#8a5a00]">
                            Confidential
                          </span>
                        ) : (
                          <span className="text-xs text-[#5e574c]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#5e574c]">
                        <time dateTime={item.updated_at || item.created_at || ''} title={updatedTs.exact}>
                          {updatedTs.relative}
                        </time>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/content/${item.id}`}
                          className="text-sm font-medium text-[#1f1c18] underline underline-offset-4 hover:text-[#5e574c]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Content Ledger Section */}
      <section aria-labelledby="content-ledger-heading" className="space-y-4">
        {/* Top Controls: Segmented Filter and Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Plain Segmented Control on Paper */}
          <div className="inline-flex items-center border border-[#ddd5c4] bg-[#fffdf8] rounded-none p-0 overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'drafts', label: 'Drafts' },
              { id: 'in_review', label: 'In review' },
              { id: 'needs_changes', label: 'Needs changes' },
              { id: 'approved', label: 'Approved' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] transition-colors cursor-pointer border-r last:border-r-0 border-[#ddd5c4] ${
                  filter === tab.id
                    ? 'bg-[#1f1c18] text-[#f5f1e8]'
                    : 'bg-[#fffdf8] text-[#5e574c] hover:bg-[#f5f1e8] hover:text-[#1f1c18]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content..."
              aria-label="Search content"
              className="w-full bg-[#fffdf8] text-[#1f1c18] placeholder-[#5e574c] border border-[#ddd5c4] rounded-none px-3 py-1.5 text-xs focus:border-[#1f1c18] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5e574c] hover:text-[#1f1c18]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Ledger-style Table on Paper */}
        {filteredContents.length === 0 ? (
          <EmptyState
            title="No content found"
            description={
              search
                ? `No submissions match "${search}". Try adjusting your query.`
                : 'No content in this view. Create a new draft to begin.'
            }
            action={
              canCreate && !search ? (
                <Link href="/content/new">
                  <Button variant="primary" size="sm">
                    New content
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="border border-[#ddd5c4] bg-[#fffdf8] overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#fffdf8] border-b border-[#ddd5c4] font-mono text-[11px] uppercase tracking-[0.04em] text-[#5e574c] sticky top-14 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Title and channel</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Version</th>
                  <th scope="col" className="px-5 py-3 font-medium">Confidential</th>
                  <th scope="col" className="px-5 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd5c4]">
                {filteredContents.map((c) => {
                  const updatedTs = formatTimestamp(c.updated_at || c.created_at);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#f5f1e8] transition-colors duration-120"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/content/${c.id}`}
                          className="font-medium text-[#1f1c18] hover:underline line-clamp-1"
                        >
                          {c.title}
                        </Link>
                        <div className="text-xs text-[#5e574c] mt-0.5">
                          <span className="capitalize">{c.channel}</span>
                          {c.audience && <span> · {c.audience}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={c.status as BadgeVariant}>
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#5e574c]">
                        v{c.current_version}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.confidential ? (
                          <span className="font-mono text-[11px] uppercase tracking-[0.04em] px-1.5 py-0.5 bg-[#f5f1e8] border border-[#ddd5c4] text-[#8a5a00]">
                            Confidential
                          </span>
                        ) : (
                          <span className="text-xs text-[#5e574c]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#5e574c]">
                        <time dateTime={c.updated_at || c.created_at || ''} title={updatedTs.exact}>
                          {updatedTs.relative}
                        </time>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/content/${c.id}`}
                          className="text-sm font-medium text-[#1f1c18] underline underline-offset-4 hover:text-[#5e574c]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
