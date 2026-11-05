import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { calculateInsights } from '@/lib/insights/aggregation';
import { InsightsClientView } from '@/components/insights/InsightsClientView';
import type {
  Finding,
  Content,
  Profile,
  Fact,
  Guideline,
  GuidelineProposal,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const session = await getSessionProfile();

  if (!session) {
    redirect('/login');
  }

  const { user, profile } = session;

  // 1. Polite 403 Page for unauthorized roles (creator, reviewer)
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return (
      <AppShell user={user} profile={profile}>
        <div className="p-6 sm:p-12 max-w-2xl w-full mx-auto my-auto">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-amber-200/60 shadow-xs">
              🛡️
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                Role Restricted
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
                Compliance Insights Access
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Organization-wide compliance trends, reviewer overrides, and guideline health analytics are reserved for{' '}
              <span className="font-semibold text-slate-800">Managers</span> and{' '}
              <span className="font-semibold text-slate-800">Administrators</span>.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-xs"
              >
                ← Return to Dashboard
              </Link>
              <Link
                href="/library"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
              >
                View Brand Library
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. Authorized data fetch for managers and admins
  const admin = getAdminClient();
  const orgId = profile.org_id;

  const [
    contentsRes,
    findingsRes,
    profilesRes,
    guidelinesRes,
    factsRes,
    proposalsRes,
  ] = await Promise.all([
    admin.from('contents').select('*').eq('org_id', orgId),
    admin.from('findings').select('*'),
    admin.from('profiles').select('*').eq('org_id', orgId),
    admin.from('guidelines').select('*').eq('org_id', orgId).order('title'),
    admin.from('facts').select('*').eq('org_id', orgId),
    admin.from('guideline_proposals').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
  ]);

  const contents = (contentsRes.data || []) as Content[];
  const allFindings = (findingsRes.data || []) as Finding[];
  const profiles = (profilesRes.data || []) as Profile[];
  const guidelines = (guidelinesRes.data || []) as Guideline[];
  const facts = (factsRes.data || []) as Fact[];
  const proposals = (proposalsRes.data || []) as GuidelineProposal[];

  // Filter findings belonging to contents of this organization
  const contentIdSet = new Set(contents.map((c) => c.id));
  const orgFindings = allFindings.filter((f) => contentIdSet.has(f.content_id));

  // Compute aggregated analytics
  const insightsData = calculateInsights({
    findings: orgFindings,
    contents,
    profiles,
    guidelines,
    facts,
    proposals,
  });

  const isDemoActive = contents.some((c) => c.title && c.title.includes('[Demo History]'));

  return (
    <AppShell user={user} profile={profile}>
      <InsightsClientView
        initialInsights={insightsData}
        guidelines={guidelines}
        userRole={profile.role}
        isDemoHistoryActive={isDemoActive}
      />
    </AppShell>
  );
}
