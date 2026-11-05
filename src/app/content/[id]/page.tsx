import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { ContentDetailView, type CommentWithProfile } from '@/components/ContentDetailView';
import type { Content, ContentVersion, Finding, AiRun } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
  const admin = getAdminClient();

  // 1. Fetch content
  const { data: content, error: contentError } = await admin
    .from('contents')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (contentError || !content) {
    notFound();
  }

  // 2. Fetch all versions
  const { data: versions } = await admin
    .from('content_versions')
    .select('*')
    .eq('content_id', id)
    .order('version', { ascending: false });

  // 3. Fetch findings
  const { data: findings } = await admin
    .from('findings')
    .select('*')
    .eq('content_id', id)
    .order('created_at', { ascending: false });

  // 4. Fetch comments with author profile
  const { data: comments } = await admin
    .from('comments')
    .select('id, content_id, author, body, created_at, profiles:author(full_name, role)')
    .eq('content_id', id)
    .order('created_at', { ascending: true });

  // 5. Fetch latest AI run
  const { data: latestAiRun } = await admin
    .from('ai_runs')
    .select('*')
    .eq('content_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell user={user} profile={profile}>
      <ContentDetailView
        user={user}
        profile={profile}
        initialContent={content as Content}
        initialVersions={(versions as ContentVersion[]) || []}
        initialFindings={(findings as Finding[]) || []}
        initialComments={(comments as unknown as CommentWithProfile[]) || []}
        initialAiRun={(latestAiRun as AiRun) || null}
      />
    </AppShell>
  );
}
