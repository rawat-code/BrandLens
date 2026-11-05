import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import type { Content, ContentVersion } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
  const admin = getAdminClient();

  const { data: content, error: contentError } = await admin
    .from('contents')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (contentError || !content) {
    notFound();
  }

  const { data: version } = await admin
    .from('content_versions')
    .select('*')
    .eq('content_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const c = content as Content;
  const v = version as ContentVersion | null;

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                {c.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-slate-500">v{c.current_version}</span>
              {c.confidential && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                  🔒 Confidential
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{c.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Channel: <span className="font-semibold text-slate-700 capitalize">{c.channel}</span>
              {c.audience && <> • Audience: <span className="text-slate-700">{c.audience}</span></>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Content Body Display */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Current Content Draft (Version {v?.version || 1})
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {v?.body || 'No content body found.'}
          </div>
          {v?.note && (
            <p className="text-xs text-slate-500 italic">
              Note: {v.note}
            </p>
          )}
        </div>

        {/* Placeholder banner for Phase 3 review engine */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
          <strong className="font-bold block mb-1">Phase 2 Draft Successfully Created!</strong>
          <span>
            Interactive dual-pane review engine, findings list, and workflow approval buttons will be connected in Phase 3 &amp; 4.
          </span>
        </div>
      </div>
    </AppShell>
  );
}
