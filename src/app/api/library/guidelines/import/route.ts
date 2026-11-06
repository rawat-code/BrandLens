import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const ImportGuidelinesSchema = z.object({
  guidelines: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Title cannot be empty').max(200),
        category: z.enum(['tone', 'messaging', 'claim', 'accessibility', 'general']),
        body: z.string().trim().min(1, 'Body cannot be empty').max(10000),
        clarification: z.string().trim().max(2000).optional().nullable(),
      })
    )
    .min(1, 'At least one guideline is required to import'),
});

export async function POST(request: Request) {
  try {
    const { profile } = await requireRole(['admin']);

    const body = await request.json();
    const parsed = ImportGuidelinesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid guidelines payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const records = parsed.data.guidelines.map((g) => ({
      id: crypto.randomUUID(),
      org_id: profile.org_id,
      created_by: profile.id,
      title: g.title,
      category: g.category,
      body: g.body,
      clarification: g.clarification || null,
      version: 1,
    }));

    const { data: inserted, error: insertError } = await admin
      .from('guidelines')
      .insert(records)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to import guidelines: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Append to audit log
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'library.guidelines.import',
      detail: {
        count: records.length,
        titles: records.map((r) => r.title),
      },
    });

    return NextResponse.json({
      success: true,
      count: (inserted || records).length,
      guidelines: inserted || records,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('Error importing guidelines:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
