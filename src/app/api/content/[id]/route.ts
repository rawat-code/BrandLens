import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { Content, ContentVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    const [
      { data: content, error: contentError },
      { data: versions, error: versionsError },
      { data: findings },
    ] = await Promise.all([
      admin.from('contents').select('*').eq('id', id).eq('org_id', profile.org_id).maybeSingle(),
      admin.from('content_versions').select('*').eq('content_id', id).order('version', { ascending: false }),
      admin.from('findings').select('*').eq('content_id', id).order('created_at', { ascending: false }),
    ]);

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (versionsError) {
      return NextResponse.json({ error: versionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      content,
      versions: versions || [],
      findings: findings || [],
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'admin']);
    const body = await req.json();

    const { body: newBody, note } = body;
    if (typeof newBody !== 'string' || !newBody.trim()) {
      return NextResponse.json({ error: 'Body text is required' }, { status: 400 });
    }
    if (newBody.length > 10000) {
      return NextResponse.json({ error: 'Content body cannot exceed 10,000 characters' }, { status: 400 });
    }

    const admin = getAdminClient();

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

    // Check if creator is allowed to edit
    if (profile.role === 'creator' && content.created_by !== profile.id) {
      return NextResponse.json({ error: 'Creators can only edit their own content drafts' }, { status: 403 });
    }

    // Increment version
    const nextVersion = (content.current_version || 1) + 1;

    // Insert new version row
    const { data: newVersionRow, error: versionInsertError } = await admin
      .from('content_versions')
      .insert({
        content_id: content.id,
        version: nextVersion,
        body: newBody.trim(),
        created_by: profile.id,
        note: note || `Revision v${nextVersion}`,
      })
      .select()
      .single();

    if (versionInsertError) {
      return NextResponse.json({ error: versionInsertError.message }, { status: 500 });
    }

    // Update current_version on contents
    const nextStatus = content.status === 'needs_changes' ? 'draft' : content.status;
    await admin
      .from('contents')
      .update({
        current_version: nextVersion,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id);

    // Record audit log
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'content.version_create',
      content_id: content.id,
      detail: {
        version: nextVersion,
        char_count: newBody.trim().length,
        note: note || `Revision v${nextVersion}`,
      },
    });

    return NextResponse.json({
      success: true,
      version: newVersionRow as ContentVersion,
      current_version: nextVersion,
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
