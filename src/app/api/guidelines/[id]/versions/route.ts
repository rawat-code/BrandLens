import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guidelineId } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const admin = getAdminClient();

    // Verify guideline belongs to caller's org
    const { data: guideline, error: gError } = await admin
      .from('guidelines')
      .select('id, org_id')
      .eq('id', guidelineId)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (gError || !guideline) {
      return NextResponse.json({ error: 'Guideline not found' }, { status: 404 });
    }

    const { data: versions, error: vError } = await admin
      .from('guideline_versions')
      .select('*')
      .eq('guideline_id', guidelineId)
      .order('version', { ascending: false });

    if (vError) {
      return NextResponse.json({ error: vError.message }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
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

