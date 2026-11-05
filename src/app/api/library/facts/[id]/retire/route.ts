import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['admin']);
    const admin = getAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from('facts')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Fact not found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('facts')
      .update({ status: 'retired' })
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
      action: 'library.fact.retire',
      detail: { fact_id: id, statement: existing.statement },
    });

    return NextResponse.json({ success: true, fact: data });
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
