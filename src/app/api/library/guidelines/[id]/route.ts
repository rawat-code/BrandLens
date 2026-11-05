import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { guidelineUpdateSchema } from '@/lib/validations/library';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    const { data, error } = await admin
      .from('guidelines')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Guideline not found' }, { status: 404 });
    }

    return NextResponse.json({ guideline: data });
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
    const { profile } = await requireRole(['admin']);
    const body = await req.json();

    const parseResult = guidelineUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from('guidelines')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Guideline not found' }, { status: 404 });
    }

    const nextVersion = (existing.version || 1) + 1;
    const updatePayload: Record<string, unknown> = {
      ...parseResult.data,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('guidelines')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'library.guideline.update',
      detail: {
        guideline_id: id,
        new_version: nextVersion,
        changes: parseResult.data,
      },
    });

    return NextResponse.json({ success: true, guideline: data });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['admin']);
    const admin = getAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from('guidelines')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Guideline not found' }, { status: 404 });
    }

    const { error } = await admin
      .from('guidelines')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'library.guideline.delete',
      detail: { guideline_id: id, title: existing.title },
    });

    return NextResponse.json({ success: true });
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
