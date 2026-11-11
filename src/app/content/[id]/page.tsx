import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { ContentDetailView, type CommentWithProfile } from '@/components/ContentDetailView';
import type { Content, ContentVersion, Finding, AiRun, Guideline, Fact, Term } from '@/lib/types';
import { computeSourceHash } from '@/lib/review/grounding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Content review — BrandLens',
  description: 'Pre-publication brand governance workbench and findings redline.',
};

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requirePageRole(['creator', 'manager', 'reviewer', 'admin']);
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

  // 6. Fetch library items to evaluate live source freshness
  const [
    { data: guidelinesData },
    { data: factsData },
    { data: termsData },
  ] = await Promise.all([
    admin.from('guidelines').select('id, title, body, version').eq('org_id', profile.org_id),
    admin.from('facts').select('id, statement, status').eq('org_id', profile.org_id),
    admin.from('terms').select('id, term, kind').eq('org_id', profile.org_id),
  ]);

  const sourceHashMap: Record<string, { hash: string; exists: boolean; title?: string }> = {};
  for (const g of (guidelinesData as Guideline[]) || []) {
    sourceHashMap[g.id] = { hash: computeSourceHash(g.body || g.title), exists: true, title: g.title };
  }
  for (const f of (factsData as Fact[]) || []) {
    sourceHashMap[f.id] = { hash: computeSourceHash(f.statement), exists: true, title: f.statement };
  }
  for (const t of (termsData as Term[]) || []) {
    sourceHashMap[t.id] = { hash: computeSourceHash(t.term), exists: true, title: t.term };
  }

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
        sourceHashMap={sourceHashMap}
      />
    </AppShell>
  );
}
