import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { Finding, Content, ContentVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { id: contentId, findingId } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const body = await req.json();

    const { action, dispute_reason } = body;
    if (!['accept', 'dispute', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept, dispute, or dismiss' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Fetch content & finding
    const [
      { data: contentData, error: contentError },
      { data: findingData, error: findingError },
    ] = await Promise.all([
      admin.from('contents').select('*').eq('id', contentId).eq('org_id', profile.org_id).maybeSingle(),
      admin.from('findings').select('*').eq('id', findingId).eq('content_id', contentId).maybeSingle(),
    ]);

    if (contentError || !contentData) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    if (findingError || !findingData) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const content = contentData as Content;
    const finding = findingData as Finding;

    if (action === 'accept') {
      if (!finding.suggestion) {
        return NextResponse.json({ error: 'This finding has no fix suggestion to accept' }, { status: 400 });
      }

      // Fetch current version body
      const { data: currentVersionData } = await admin
        .from('content_versions')
        .select('*')
        .eq('content_id', contentId)
        .eq('version', content.current_version)
        .single();

      if (!currentVersionData) {
        return NextResponse.json({ error: 'Current version not found' }, { status: 404 });
      }

      const currentVersion = currentVersionData as ContentVersion;
      let newBody = currentVersion.body;

      // Replace excerpt with suggestion if exact match or indices exist
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
      } else if (finding.source_quote && new RegExp(`\\b${finding.source_quote}\\b`, 'i').test(newBody)) {
        newBody = newBody.replace(new RegExp(`\\b${finding.source_quote}\\b`, 'i'), finding.suggestion);
      }

      // Create next version
      const nextVersion = (content.current_version || 1) + 1;
      const { data: newVersionRow, error: versionError } = await admin
        .from('content_versions')
        .insert({
          content_id: content.id,
          version: nextVersion,
          body: newBody,
          created_by: profile.id,
          note: `Applied suggestion: ${finding.rule_key}`,
        })
        .select()
        .single();

      if (versionError) {
        return NextResponse.json({ error: versionError.message }, { status: 500 });
      }

      // Update contents.current_version
      await admin
        .from('contents')
        .update({
          current_version: nextVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', content.id);

      // Update finding status to 'accepted'
      const { data: updatedFinding, error: findingUpdateError } = await admin
        .from('findings')
        .update({ status: 'accepted' })
        .eq('id', findingId)
        .select()
        .single();

      if (findingUpdateError) {
        return NextResponse.json({ error: findingUpdateError.message }, { status: 500 });
      }

      // Audit log
      await logAudit({
        org_id: profile.org_id,
        actor: profile.id,
        action: 'finding.accept',
        content_id: content.id,
        detail: {
          finding_id: finding.id,
          rule_key: finding.rule_key,
          suggestion: finding.suggestion,
          new_version: nextVersion,
        },
      });

      return NextResponse.json({
        success: true,
        finding: updatedFinding,
        version: newVersionRow,
        current_version: nextVersion,
      });
    } else if (action === 'dispute') {
      if (!dispute_reason || typeof dispute_reason !== 'string' || !dispute_reason.trim()) {
        return NextResponse.json({ error: 'Dispute reason is required' }, { status: 400 });
      }

      const { data: updatedFinding, error: findingUpdateError } = await admin
        .from('findings')
        .update({
          status: 'disputed',
          dispute_reason: dispute_reason.trim(),
        })
        .eq('id', findingId)
        .select()
        .single();

      if (findingUpdateError) {
        return NextResponse.json({ error: findingUpdateError.message }, { status: 500 });
      }

      await logAudit({
        org_id: profile.org_id,
        actor: profile.id,
        action: 'finding.dispute',
        content_id: content.id,
        detail: {
          finding_id: finding.id,
          dispute_reason: dispute_reason.trim(),
        },
      });

      return NextResponse.json({ success: true, finding: updatedFinding });
    } else {
      // Dismiss
      const { data: updatedFinding, error: findingUpdateError } = await admin
        .from('findings')
        .update({ status: 'dismissed' })
        .eq('id', findingId)
        .select()
        .single();

      if (findingUpdateError) {
        return NextResponse.json({ error: findingUpdateError.message }, { status: 500 });
      }

      await logAudit({
        org_id: profile.org_id,
        actor: profile.id,
        action: 'finding.dismiss',
        content_id: content.id,
        detail: {
          finding_id: finding.id,
        },
      });

      return NextResponse.json({ success: true, finding: updatedFinding });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
