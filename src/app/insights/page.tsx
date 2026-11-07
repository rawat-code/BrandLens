import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Insights — BrandLens',
  description: 'Compliance trends, guideline health, and reviewer override analytics.',
};

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
        <div className="p-6 sm:p-12 max-w-xl w-full mx-auto my-auto">
          <div className="bg-[#fffdf8] p-8 rounded-none border border-[#ddd5c4] shadow-none text-center space-y-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#8a5a00] bg-[#f6e3b4] px-2 py-0.5 border border-[#8a5a00] inline-block">
              Access restricted
            </span>
            <h1 className="font-serif text-[32px] font-medium text-[#1f1c18] leading-[1.1]">
              Insights restricted
            </h1>
            <p className="text-sm text-[#5e574c] leading-[1.55] max-w-md mx-auto">
              Compliance trends and guideline analytics are reserved for Managers and Administrators.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[#f5f1e8] bg-[#1f1c18] hover:bg-[#1f1c18]/90 rounded-none transition-opacity duration-120"
              >
                Return to dashboard
              </Link>
              <Link
                href="/library"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[#1f1c18] bg-[#fffdf8] hover:bg-[#f5f1e8] border border-[#1f1c18] rounded-none transition-colors duration-120"
              >
                View library
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
        orgName={profile.org_name}
      />
    </AppShell>
  );
}
