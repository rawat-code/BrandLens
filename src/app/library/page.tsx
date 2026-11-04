import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import type { Guideline, Fact, Term } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  const admin = getAdminClient();
  const [
    { data: guidelines },
    { data: facts },
    { data: terms },
  ] = await Promise.all([
    admin.from('guidelines').select('*').eq('org_id', profile.org_id),
    admin.from('facts').select('*').eq('org_id', profile.org_id),
    admin.from('terms').select('*').eq('org_id', profile.org_id),
  ]);

  const guidelineList = (guidelines as Guideline[]) || [];
  const factList = (facts as Fact[]) || [];
  const termList = (terms as Term[]) || [];

  return (
    <AppShell user={user} profile={profile}>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Governance Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Approved guidelines, clinical facts, and terminology standards for Verdant Skin
          </p>
        </div>

        {/* Section 1: Guidelines */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Brand Guidelines ({guidelineList.length})</h2>
              <p className="text-xs text-slate-500">Official rules governing tone, claims, accessibility, and brand identity</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidelineList.map((g) => (
              <div key={g.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {g.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">v{g.version}</span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{g.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{g.body}</p>
                {g.clarification && (
                  <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                    💡 {g.clarification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Approved Facts */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Approved Facts ({factList.length})</h2>
            <p className="text-xs text-slate-500">Verified claims and clinical study citations</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factList.map((f) => (
              <div key={f.id} className="p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      f.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {f.status.toUpperCase()}
                  </span>
                  {f.owner && <span className="text-xs text-slate-500">{f.owner}</span>}
                </div>
                <p className="text-xs font-medium text-slate-800">&ldquo;{f.statement}&rdquo;</p>
                {f.source_note && (
                  <p className="text-xs text-slate-500">Source: {f.source_note}</p>
                )}
                {f.expires_at && (
                  <p className="text-xs text-slate-400">
                    Expires: {new Date(f.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Terminology */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Terminology Dictionary ({termList.length})</h2>
            <p className="text-xs text-slate-500">Banned terms, caution words, and preferred vocabulary</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {termList.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">{t.term}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      t.kind === 'banned'
                        ? 'bg-rose-100 text-rose-800'
                        : t.kind === 'caution'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {t.kind}
                  </span>
                </div>
                {t.replacement && (
                  <p className="text-xs text-emerald-700">Use: &ldquo;{t.replacement}&rdquo;</p>
                )}
                {t.note && <p className="text-xs text-slate-500">{t.note}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
