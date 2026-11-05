import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { contentCreateSchema } from '@/lib/validations/content';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    const { data, error } = await admin
      .from('contents')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contents: data });
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

export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireRole(['creator', 'manager', 'admin']);
    const body = await req.json();

    const parseResult = contentCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, channel, audience, confidential, body: contentBody, note } = parseResult.data;
    const admin = getAdminClient();

    // 1. Insert content record
    const { data: content, error: contentError } = await admin
      .from('contents')
      .insert({
        org_id: profile.org_id,
        title,
        channel,
        audience: audience || null,
        confidential,
        status: 'draft',
        created_by: profile.id,
        current_version: 1,
      })
      .select()
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { error: contentError?.message || 'Failed to create content' },
        { status: 500 }
      );
    }

    // 2. Insert initial version (v1)
    const { data: version, error: versionError } = await admin
      .from('content_versions')
      .insert({
        content_id: content.id,
        version: 1,
        body: contentBody,
        created_by: profile.id,
        note: note || 'Initial draft',
      })
      .select()
      .single();

    if (versionError || !version) {
      // Rollback content creation if version insert fails
      await admin.from('contents').delete().eq('id', content.id);
      return NextResponse.json(
        { error: versionError?.message || 'Failed to create initial version' },
        { status: 500 }
      );
    }

    // 3. Write to append-only audit_log
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'content.create',
      content_id: content.id,
      detail: {
        title: content.title,
        channel: content.channel,
        confidential: content.confidential,
        audience: content.audience,
        version: 1,
      },
    });

    return NextResponse.json(
      {
        success: true,
        content,
        version,
      },
      { status: 201 }
    );
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
