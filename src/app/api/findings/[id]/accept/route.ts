import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { Finding, Content, ContentVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: findingId } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    // 1. Fetch finding
    const { data: findingData, error: findingError } = await admin
      .from('findings')
      .select('*')
      .eq('id', findingId)
      .maybeSingle();

    if (findingError || !findingData) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }
    const finding = findingData as Finding;

    // 2. Fetch associated content
    const { data: contentData, error: contentError } = await admin
      .from('contents')
      .select('*')
      .eq('id', finding.content_id)
      .maybeSingle();

    if (contentError || !contentData) {
      return NextResponse.json({ error: 'Associated content not found' }, { status: 404 });
    }
    const content = contentData as Content;

    // 3. Org boundary & Creator check
    if (content.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden: Content belongs to a different org' }, { status: 403 });
    }
    if (profile.role === 'creator' && content.created_by !== profile.id) {
      return NextResponse.json({ error: 'Creators can only modify their own content' }, { status: 403 });
    }

    if (!finding.suggestion) {
      return NextResponse.json({ error: 'This finding has no suggestion to apply' }, { status: 400 });
    }

    // 4. Fetch current version body
    const { data: versionData, error: versionError } = await admin
      .from('content_versions')
      .select('*')
      .eq('content_id', content.id)
      .eq('version', content.current_version)
      .single();

    if (versionError || !versionData) {
      return NextResponse.json({ error: 'Current version not found' }, { status: 404 });
    }
    const currentVersion = versionData as ContentVersion;
    let newBody = currentVersion.body;

    // 5. Replace text with suggestion
    if (
      typeof finding.start_idx === 'number' &&
      typeof finding.end_idx === 'number' &&
      finding.start_idx >= 0 &&
      finding.end_idx <= newBody.length
    ) {
      newBody =
        newBody.slice(0, finding.start_idx) +
        finding.suggestion +
        newBody.slice(finding.end_idx);
    } else if (finding.excerpt && newBody.includes(finding.excerpt)) {
      newBody = newBody.replace(finding.excerpt, finding.suggestion);
    } else if (finding.source_quote && newBody.includes(finding.source_quote)) {
      newBody = newBody.replace(finding.source_quote, finding.suggestion);
    }

    // 6. Create next version
    const nextVersion = (content.current_version || 1) + 1;
    const { data: newVersionRow, error: newVerError } = await admin
      .from('content_versions')
      .insert({
        content_id: content.id,
        version: nextVersion,
        body: newBody,
        created_by: profile.id,
        note: `Applied suggestion for ${finding.rule_key}`,
      })
      .select()
      .single();

    if (newVerError) {
      return NextResponse.json({ error: newVerError.message }, { status: 500 });
    }

    // 7. Update contents.current_version and reset status to draft
    await admin
      .from('contents')
      .update({
        current_version: nextVersion,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id);

    // 8. Mark finding as accepted
    await admin
      .from('findings')
      .update({ status: 'accepted' })
      .eq('id', finding.id);

    // 9. Log audit
    await logAudit({
      org_id: content.org_id,
      actor: profile.id,
      action: 'finding.accept',
      content_id: content.id,
      detail: {
        finding_id: finding.id,
        rule_key: finding.rule_key,
        previous_version: content.current_version,
        new_version: nextVersion,
      },
    });

    return NextResponse.json({
      success: true,
      finding_id: finding.id,
      new_version: newVersionRow,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Accept finding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

