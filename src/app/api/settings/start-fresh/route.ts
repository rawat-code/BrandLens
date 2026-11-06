import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const StartFreshSchema = z.object({
  confirmationName: z.string().trim().min(1, 'Confirmation name is required'),
});

export async function POST(request: Request) {
  try {
    const { profile } = await requireRole(['admin']);

    const body = await request.json();
    const parsed = StartFreshSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirmation name is required', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Verify current organization
    const { data: org, error: orgError } = await admin
      .from('orgs')
      .select('id, name')
      .eq('id', profile.org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    if (parsed.data.confirmationName.trim().toLowerCase() !== org.name.trim().toLowerCase()) {
      return NextResponse.json(
        {
          error: `Organisation name does not match. Please type "${org.name}" exactly to confirm.`,
        },
        { status: 400 }
      );
    }

    // 1. Get all content IDs for this org
    const { data: contents } = await admin
      .from('contents')
      .select('id')
      .eq('org_id', profile.org_id);

    const contentIds = (contents || []).map((c) => c.id);

    // 2. Cascade delete content-related data in foreign-key dependency order
    if (contentIds.length > 0) {
      await admin.from('comments').delete().in('content_id', contentIds);
      await admin.from('findings').delete().in('content_id', contentIds);
      await admin.from('ai_runs').delete().in('content_id', contentIds);
      await admin.from('content_versions').delete().in('content_id', contentIds);
      await admin.from('contents').delete().eq('org_id', profile.org_id);
    }

    // 3. Delete guideline proposals, guidelines, facts, terms for this org
    await admin.from('guideline_proposals').delete().eq('org_id', profile.org_id);
    await admin.from('guidelines').delete().eq('org_id', profile.org_id);
    await admin.from('facts').delete().eq('org_id', profile.org_id);
    await admin.from('terms').delete().eq('org_id', profile.org_id);

    // 4. Log audit entry for the start fresh action
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'org.start_fresh',
      detail: {
        org_name: org.name,
        cleared_contents_count: contentIds.length,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organisation brand data has been reset successfully. You can now load new brand materials in the Library.`,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('Error executing start fresh reset:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
