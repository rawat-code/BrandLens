import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { SettingsClientView } from '@/components/SettingsClientView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings — BrandLens',
  description: 'Organization settings and brand data management.',
};

export default async function SettingsPage() {
  let session;
  try {
    session = await requireRole(['admin']);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect('/login');
    }
    // Polite 403 screen for non-admin roles
    if (err instanceof ForbiddenError) {
      return (
        <div className="min-h-screen bg-[#f5f1e8] flex items-center justify-center p-4">
          <div className="bg-[#fffdf8] p-8 rounded-none border border-[#ddd5c4] shadow-none max-w-md w-full text-center space-y-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#8a5a00] bg-[#f6e3b4] px-2 py-0.5 border border-[#8a5a00] inline-block">
              Access restricted
            </span>
            <h1 className="font-serif text-[32px] font-medium text-[#1f1c18] leading-[1.1]">
              Access restricted
            </h1>
            <p className="text-sm text-[#5e574c] leading-[1.55]">
              Organisation settings and brand data management are reserved exclusively for Administrators.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-[#1f1c18] hover:bg-[#1f1c18]/90 text-[#f5f1e8] rounded-none text-sm font-medium transition-opacity duration-120"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      );
    }
    throw err;
  }

  const { user, profile } = session;
  const admin = getAdminClient();

  // 1. Fetch current org
  const { data: org } = await admin
    .from('orgs')
    .select('id, name, created_at')
    .eq('id', profile.org_id)
    .single();

  const orgData = org || {
    id: profile.org_id,
    name: profile.org_name || 'Workspace',
    created_at: new Date().toISOString(),
  };

  // 2. Fetch counts in parallel
  const [
    { count: guidelinesCount },
    { count: factsCount },
    { count: termsCount },
    { count: contentsCount },
  ] = await Promise.all([
    admin.from('guidelines').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id),
    admin.from('facts').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id),
    admin.from('terms').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id),
    admin.from('contents').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id),
  ]);

  return (
    <AppShell user={user} profile={profile}>
      <SettingsClientView
        initialOrg={orgData}
        counts={{
          guidelines: guidelinesCount || 0,
          facts: factsCount || 0,
          terms: termsCount || 0,
          contents: contentsCount || 0,
        }}
      />
    </AppShell>
  );
}
