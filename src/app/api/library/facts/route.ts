import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { factCreateSchema } from '@/lib/validations/library';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    const { data, error } = await admin
      .from('facts')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('status', { ascending: true }) // 'approved' before 'expired'
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ facts: data });
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
    const { profile } = await requireRole(['admin']);
    const body = await req.json();

    const parseResult = factCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { statement, source_note, owner, expires_at, status } = parseResult.data;
    const admin = getAdminClient();

    const { data, error } = await admin
      .from('facts')
      .insert({
        org_id: profile.org_id,
        statement,
        source_note: source_note || null,
        owner: owner || null,
        expires_at: expires_at || null,
        status,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'library.fact.create',
      detail: { fact_id: data.id, statement: data.statement, status: data.status },
    });

    return NextResponse.json({ success: true, fact: data }, { status: 201 });
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
