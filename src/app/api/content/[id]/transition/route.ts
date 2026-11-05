import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { canTransition } from '@/lib/workflow';
import { logAudit } from '@/lib/audit';
import type { Content, ContentStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const body = await req.json();

    const { to, comment } = body;
    if (!to) {
      return NextResponse.json({ error: 'Target status "to" is required' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Fetch content
    const { data: contentData, error: contentError } = await admin
      .from('contents')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (contentError || !contentData) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const content = contentData as Content;
    const fromStatus = content.status;
    const toStatus = to as ContentStatus;

    // 2. Check open high-severity findings that require reviewer
    const { data: highSevFindings } = await admin
      .from('findings')
      .select('id')
      .eq('content_id', id)
      .eq('version', content.current_version)
      .eq('severity', 'high')
      .eq('requires_reviewer', true)
      .eq('status', 'open');

    const hasOpenHighSeverityRequiringReviewer = (highSevFindings?.length || 0) > 0;
    const isOwnContent = content.created_by === profile.id;

    // 3. Verify workflow rules
    const allowed = canTransition(profile.role, fromStatus, toStatus, {
      hasOpenHighSeverityRequiringReviewer,
      isOwnContent,
    });

    if (!allowed) {
      let reason = `Transition from "${fromStatus}" to "${toStatus}" is not permitted for role "${profile.role}".`;
      if (profile.role === 'creator' && toStatus === 'approved') {
        reason = 'Separation of duties: Creators cannot approve content.';
      } else if (profile.role === 'manager' && isOwnContent && toStatus === 'approved') {
        reason = 'Separation of duties: Managers cannot approve their own content drafts.';
      } else if (profile.role === 'manager' && hasOpenHighSeverityRequiringReviewer && toStatus === 'approved') {
        reason = 'Cannot approve: High-severity findings remain open that require Reviewer approval.';
      } else if (toStatus === 'published' && (!isOwnContent || profile.role !== 'creator')) {
        reason = 'Only the creator can publish their own approved content.';
      }
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // 4. Require comment for needs_changes and rejected
    if ((toStatus === 'needs_changes' || toStatus === 'rejected') && (!comment || !comment.trim())) {
      return NextResponse.json(
        { error: `A comment explaining the reason is required when transition is "${toStatus}".` },
        { status: 400 }
      );
    }

    // 5. Update content status
    const { data: updatedContent, error: updateError } = await admin
      .from('contents')
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 6. Insert comment if provided
    if (comment && comment.trim()) {
      await admin.from('comments').insert({
        content_id: id,
        author: profile.id,
        body: comment.trim(),
      });
    }

    // 7. Write audit log
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'workflow.transition',
      content_id: id,
      detail: {
        from: fromStatus,
        to: toStatus,
        comment: comment || null,
        has_high_severity: hasOpenHighSeverityRequiringReviewer,
      },
    });

    return NextResponse.json({
      success: true,
      content: updatedContent,
      from: fromStatus,
      to: toStatus,
    });
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
