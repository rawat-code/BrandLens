import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { DashboardView } from '@/components/DashboardView';
import type { Content, Finding } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Content — BrandLens',
  description: 'Manage and review content submissions.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

  const admin = getAdminClient();

  const [
    { data: contents },
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

  // Creator sees their own content; others see all org content
  const myContent = isCreator
    ? contentList.filter((c) => c.created_by === profile.id)
    : contentList;

  return (
    <AppShell user={user} profile={profile}>
      <DashboardView
        initialContents={myContent}
        reviewQueue={reviewQueue}
        profile={profile}
        canCreate={canCreate}
        isCreator={isCreator}
        isApprover={isApprover}
      />
    </AppShell>
  );
}
