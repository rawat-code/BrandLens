import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    const { data: comments, error } = await admin
      .from('comments')
      .select('id, content_id, author, body, created_at, profiles:author(full_name, role)')
      .eq('content_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const body = await req.json();

    const { body: commentText } = body;
    if (!commentText || typeof commentText !== 'string' || !commentText.trim()) {
      return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: newComment, error: commentError } = await admin
      .from('comments')
      .insert({
        content_id: id,
        author: profile.id,
        body: commentText.trim(),
      })
      .select('id, content_id, author, body, created_at, profiles:author(full_name, role)')
      .single();

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'content.comment',
      content_id: id,
      detail: { comment_id: newComment.id },
    });

    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
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
