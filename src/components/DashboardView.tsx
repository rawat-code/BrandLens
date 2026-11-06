'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import type { Content, ContentStatus, Profile } from '@/lib/types';

interface ReviewQueueItem extends Content {
  highSevCount: number;
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

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; variant: 'neutral' | 'indigo' | 'medium' | 'low' | 'success' | 'high' }
> = {
  draft: { label: 'Draft', variant: 'neutral' },
  ai_reviewed: { label: 'AI reviewed', variant: 'indigo' },
  needs_changes: { label: 'Needs changes', variant: 'medium' },
  in_review: { label: 'In review', variant: 'low' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'high' },
  published: { label: 'Published', variant: 'success' },
};

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
    return {
      total: initialContents.length,
      drafts: initialContents.filter((c) => c.status === 'draft' || c.status === 'ai_reviewed').length,
      inReview: initialContents.filter((c) => c.status === 'in_review').length,
      needsChanges: initialContents.filter((c) => c.status === 'needs_changes').length,
      approved: initialContents.filter((c) => c.status === 'approved' || c.status === 'published').length,
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

  const pageTitle = isCreator ? 'Content submissions' : 'Review queue and content';
  const pageDescription = isCreator
    ? 'Draft, audit against brand rules, and route content for role-based approval'
    : 'Monitor incoming submissions, evaluate cited evidence, and issue decisions';

  return (
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title={pageTitle}
        description={`${pageDescription} · ${profile.org_name || 'Verdant Skin'}`}
        actions={
          canCreate ? (
            <Link href="/content/new">
              <Button
                variant="primary"
                size="md"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
              >
                New content
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Compact Metrics Strip (Single Row) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 rounded-xl bg-[#11111a] border border-white/[0.08] text-xs text-[#a3a3bb]">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#ececf6] font-medium text-sm">{counts.total}</span>
          <span>total</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#ececf6] font-medium text-sm">{counts.drafts}</span>
          <span>drafts</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#7fb4ff] font-medium text-sm">{counts.inReview}</span>
          <span>in review</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#f5b74f] font-medium text-sm">{counts.needsChanges}</span>
          <span>needs changes</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[#5fd1a0] font-medium text-sm">{counts.approved}</span>
          <span>approved</span>
        </div>
      </div>

      {/* Review Queue (For Managers & Reviewers) */}
      {isApprover && reviewQueue.length > 0 && (
        <Card variant="panel" className="border-indigo-500/25 overflow-hidden">
          <CardHeader className="bg-indigo-500/[0.04]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <CardTitle className="text-sm font-medium">
                  Review queue ({reviewQueue.length})
                </CardTitle>
              </div>
              <CardDescription>
                Submissions awaiting human review — sorted by highest open severity first
              </CardDescription>
            </div>
          </CardHeader>
          <div className="divide-y divide-white/[0.04]">
            {reviewQueue.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#171724]/50 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm text-[#ececf6] truncate">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono text-[#7b7b94]">
                      v{item.current_version}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#171724] text-[#a3a3bb] border border-white/[0.06] capitalize">
                      {item.channel}
                    </span>
                    {item.confidential && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#f5b74f]/10 text-[#f5b74f] border border-[#f5b74f]/30 font-medium">
                        Confidential
                      </span>
                    )}
                  </div>
                  {item.highSevCount > 0 ? (
                    <p className="text-xs text-[#ff7a8a] flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a8a]" />
                      {item.highSevCount} high-severity issue(s) cited &mdash; Reviewer approval required
                    </p>
                  ) : (
                    <p className="text-xs text-[#5fd1a0] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5fd1a0]" />
                      No high-severity blocking issues
                    </p>
                  )}
                </div>

                <Link href={`/content/${item.id}`} className="shrink-0 self-start sm:self-auto">
                  <Button variant="secondary" size="sm">
                    Open review &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content Table with Filters */}
      <Card variant="panel" className="overflow-hidden">
        {/* Table Top Controls: Filters & Search */}
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
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
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer select-none ${
                  filter === tab.id
                    ? 'bg-[#171724] text-[#ececf6] font-medium border border-white/10'
                    : 'text-[#a3a3bb] hover:text-[#ececf6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content..."
              className="w-full bg-[#171724] text-[#ececf6] placeholder-[#7b7b94] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7b7b94] hover:text-[#ececf6]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Contents Table */}
        {filteredContents.length === 0 ? (
          <EmptyState
            title="No content found"
            description={
              search
                ? `No items match "${search}". Try adjusting your query.`
                : 'Get started by creating your first content draft.'
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#ececf6]">
              <thead className="bg-[#171724] text-[11px] uppercase tracking-wider text-[#a3a3bb] border-b border-white/[0.08]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Title &amp; Channel</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Version</th>
                  <th scope="col" className="px-5 py-3 font-medium">Confidential</th>
                  <th scope="col" className="px-5 py-3 font-medium">Created</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredContents.map((c) => {
                  const statusConf = STATUS_CONFIG[c.status] || {
                    label: c.status,
                    variant: 'neutral' as const,
                  };

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#171724]/50 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/content/${c.id}`}
                          className="font-medium text-[#ececf6] hover:text-[#a5b4fc] transition-colors line-clamp-1"
                        >
                          {c.title}
                        </Link>
                        <div className="text-xs text-[#7b7b94] mt-0.5 flex items-center gap-2">
                          <span className="capitalize">{c.channel}</span>
                          {c.audience && <span>&bull; {c.audience}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusConf.variant}>
                          {statusConf.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#a3a3bb]">
                        v{c.current_version}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.confidential ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#f5b74f] font-medium bg-[#f5b74f]/10 px-2 py-0.5 rounded border border-[#f5b74f]/25">
                            Confidential
                          </span>
                        ) : (
                          <span className="text-xs text-[#7b7b94]">Standard</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#a3a3bb] font-mono">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/content/${c.id}`}
                          className="text-xs text-[#a5b4fc] hover:underline font-medium"
                        >
                          Open &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
