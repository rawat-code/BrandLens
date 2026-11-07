import type { Metadata } from 'next';
import { requirePageRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { LibraryManager } from '@/components/LibraryManager';
import type { Guideline, Fact, Term } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Library — BrandLens',
  description: 'Approved brand guidelines, clinical facts, and terminology library.',
};

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const { user, profile } = await requirePageRole(['creator', 'manager', 'reviewer', 'admin']);

  const admin = getAdminClient();
  const [
    { data: guidelines },
    { data: facts },
    { data: terms },
  ] = await Promise.all([
    admin
      .from('guidelines')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('category', { ascending: true })
      .order('title', { ascending: true }),
    admin
      .from('facts')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false }),
    admin
      .from('terms')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('kind', { ascending: true })
      .order('term', { ascending: true }),
  ]);

  return (
    <AppShell user={user} profile={profile}>
      <LibraryManager
        user={user}
        profile={profile}
        initialGuidelines={(guidelines as Guideline[]) || []}
        initialFacts={(facts as Fact[]) || []}
        initialTerms={(terms as Term[]) || []}
      />
    </AppShell>
  );
}
