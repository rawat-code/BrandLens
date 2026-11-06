import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';
import type { Content, ContentStatus, Finding } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_BADGES: Record<ContentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  ai_reviewed: { label: 'AI Reviewed', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  needs_changes: { label: 'Needs Changes', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  in_review: { label: 'In Review', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 border-rose-300' },
  published: { label: 'Published', className: 'bg-teal-100 text-teal-800 border-teal-300' },
};

export default async function DashboardPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  const admin = getAdminClient();

  const [
    { data: contents, error },
    { data: openFindings },
  ] = await Promise.all([
    admin
      .from('contents')
      .select('id, org_id, title, channel, audience, confidential, status, created_by, current_version, created_at, updated_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
    admin
      .from('findings')
      .select('content_id, severity, status, requires_reviewer')
      .eq('status', 'open'),
  ]);

  const contentList: Content[] = (contents as Content[]) || [];
  const findingsList: Partial<Finding>[] = (openFindings as Partial<Finding>[]) || [];

  const counts = {
    total: contentList.length,
    inReview: contentList.filter((c) => c.status === 'in_review').length,
    approved: contentList.filter((c) => c.status === 'approved' || c.status === 'published').length,
    drafts: contentList.filter((c) => c.status === 'draft' || c.status === 'ai_reviewed').length,
    needsChanges: contentList.filter((c) => c.status === 'needs_changes').length,
  };

  const isCreator = profile.role === 'creator';
  const isApprover = profile.role === 'manager' || profile.role === 'reviewer' || profile.role === 'admin';
  const canCreate = ['creator', 'manager', 'admin'].includes(profile.role);

  // Review Queue for Managers/Reviewers: content in 'in_review'
  const reviewQueue = contentList
    .filter((c) => c.status === 'in_review')
    .map((c) => {
      const cFindings = findingsList.filter((f) => f.content_id === c.id);
      const highSevCount = cFindings.filter((f) => f.severity === 'high').length;
      return {
        ...c,
        highSevCount,
        totalFindings: cFindings.length,
      };
    })
    .sort((a, b) => {
      // Sort by highest open severity first, then age
      if (b.highSevCount !== a.highSevCount) {
        return b.highSevCount - a.highSevCount;
      }
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

  // Creator's own content
  const myContent = isCreator
    ? contentList.filter((c) => c.created_by === profile.id)
    : contentList;

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isCreator ? 'My Creator Studio' : 'Compliance & Review Dashboard'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {profile.org_name || 'Workspace'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isCreator
                ? 'Create, audit, and submit marketing copy for brand compliance and approval'
                : 'Monitor review queues, evaluate citations, and execute role-based human approvals'}
            </p>
          </div>
          {canCreate && (
            <Link
              href="/content/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Content Draft
            </Link>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isCreator ? 'My Submissions' : 'Total Library Items'}
            </dt>
            <dd className="mt-2 text-3xl font-extrabold text-slate-900">{myContent.length}</dd>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Drafts</dt>
            <dd className="mt-2 text-3xl font-extrabold text-slate-700">{counts.drafts}</dd>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Review</dt>
            <dd className="mt-2 text-3xl font-extrabold text-blue-600">{counts.inReview}</dd>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved &amp; Live</dt>
            <dd className="mt-2 text-3xl font-extrabold text-emerald-600">{counts.approved}</dd>
          </div>
        </div>

        {/* REVIEW QUEUE (For Managers, Reviewers, Admins) */}
        {isApprover && reviewQueue.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Active Approval Queue ({reviewQueue.length})
                </h2>
                <p className="text-xs text-blue-700 mt-0.5">
                  Submissions awaiting review &mdash; sorted by highest open severity first
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.title}</span>
                      <span className="text-xs font-mono text-slate-400">v{item.current_version}</span>
                      <span className="capitalize text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {item.channel}
                      </span>
                      {item.confidential && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                          🔒 Confidential
                        </span>
                      )}
                    </div>
                    {item.highSevCount > 0 ? (
                      <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        ⚠️ {item.highSevCount} high-severity issue(s) cited &mdash; Reviewer approval required
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium">
                        ✓ No high-severity blocking issues
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/content/${item.id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
                  >
                    Open Review Workbench &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {isCreator ? 'My Content Submissions' : 'All Organization Submissions'}
            </h2>
            <span className="text-xs text-slate-500 font-mono">Showing {myContent.length} items</span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-200">
              Failed to load contents: {error.message}
            </div>
          )}

          {myContent.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">No content items yet</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by creating a new copy draft or campaign post.</p>
              {canCreate && (
                <Link
                  href="/content/new"
                  className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Create First Draft
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Title &amp; Channel</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Version</th>
                    <th scope="col" className="px-6 py-3">Confidential</th>
                    <th scope="col" className="px-6 py-3">Created</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {myContent.map((c) => {
                    const badge = STATUS_BADGES[c.status] || {
                      label: c.status,
                      className: 'bg-slate-100 text-slate-800 border-slate-300',
                    };
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/content/${c.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                            {c.title}
                          </Link>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                              {c.channel}
                            </span>
                            {c.audience && <span>&bull; {c.audience}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                          v{c.current_version}
                        </td>
                        <td className="px-6 py-4">
                          {c.confidential ? (
                            <span className="inline-flex items-center text-xs text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Confidential
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Public</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/content/${c.id}`}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                          >
                            Open workbench &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
