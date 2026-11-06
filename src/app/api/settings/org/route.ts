import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const UpdateOrgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organisation name cannot be empty')
    .max(100, 'Organisation name must be 100 characters or less'),
});

export async function PATCH(request: Request) {
  try {
    const { profile } = await requireRole(['admin']);

    const body = await request.json();
    const parsed = UpdateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Fetch current org for audit logging
    const { data: currentOrg, error: fetchError } = await admin
      .from('orgs')
      .select('id, name')
      .eq('id', profile.org_id)
      .single();

    if (fetchError || !currentOrg) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const newName = parsed.data.name;

    // Update organisation name
    const { data: updatedOrg, error: updateError } = await admin
      .from('orgs')
      .update({ name: newName })
      .eq('id', profile.org_id)
      .select('id, name')
      .single();

    if (updateError || !updatedOrg) {
      return NextResponse.json(
        { error: `Failed to update organisation: ${updateError?.message}` },
        { status: 500 }
      );
    }

    // Append to audit log
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'org.update_name',
      detail: {
        previous_name: currentOrg.name,
        new_name: newName,
      },
    });

    return NextResponse.json({
      success: true,
      org: updatedOrg,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('Error updating organisation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

