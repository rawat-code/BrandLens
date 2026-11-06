import { redirect } from 'next/navigation';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { SettingsClientView } from '@/components/SettingsClientView';

export const dynamic = 'force-dynamic';

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl mx-auto border border-amber-200">
              🛡️
            </div>
            <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
            <p className="text-sm text-slate-600">
              Organisation Settings and brand data management are reserved exclusively for Administrators.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
            >
              Return to Dashboard
            </a>
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
