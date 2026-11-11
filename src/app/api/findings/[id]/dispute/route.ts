import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { Finding, Content } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: findingId } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
    const body = await req.json().catch(() => ({}));
    const reason = body.dispute_reason || body.reason;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'A dispute_reason is required to dispute a finding' },
        { status: 400 }
      );
    }

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

    // 3. Org boundary & permissions
    if (content.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden: Content belongs to a different org' }, { status: 403 });
    }
    if (profile.role === 'creator' && content.created_by !== profile.id) {
      return NextResponse.json({ error: 'Creators can only dispute findings on their own content' }, { status: 403 });
    }

    // Concurrency protection: prevent disputing already resolved or disputed findings
    if (finding.status !== 'open') {
      return NextResponse.json(
        { error: `Conflict: Finding has already been marked "${finding.status}". Please refresh the review.` },
        { status: 409 }
      );
    }

    // 4. Update finding status
    const { error: updateError } = await admin
      .from('findings')
      .update({
        status: 'disputed',
        dispute_reason: reason.trim(),
      })
      .eq('id', finding.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Log audit
    await logAudit({
      org_id: content.org_id,
      actor: profile.id,
      action: 'finding.dispute',
      content_id: content.id,
      detail: {
        finding_id: finding.id,
        rule_key: finding.rule_key,
        dispute_reason: reason.trim(),
      },
    });

    return NextResponse.json({ success: true, finding_id: finding.id, status: 'disputed' });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Dispute finding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

