import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const DecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await requireRole(['manager', 'admin']);
    const { id: proposalId } = await context.params;

    const body = await req.json();
    const parsed = DecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid decision: must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const { decision } = parsed.data;
    const admin = getAdminClient();

    // 1. Fetch proposal
    const { data: proposal, error: pError } = await admin
      .from('guideline_proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (pError || !proposal) {
      return NextResponse.json(
        { error: 'Guideline proposal not found' },
        { status: 404 }
      );
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json(
        { error: `Proposal already decided (${proposal.status})` },
        { status: 400 }
      );
    }

    if (decision === 'approve') {
      if (!proposal.guideline_id) {
        return NextResponse.json(
          { error: 'Proposal is missing guideline reference' },
          { status: 400 }
        );
      }

      // Fetch current guideline to bump version
      const { data: guideline, error: gError } = await admin
        .from('guidelines')
        .select('*')
        .eq('id', proposal.guideline_id)
        .eq('org_id', profile.org_id)
        .maybeSingle();

      if (gError || !guideline) {
        return NextResponse.json(
          { error: 'Associated guideline not found' },
          { status: 404 }
        );
      }

      const newVersion = (guideline.version || 1) + 1;
      const appliedAt = new Date().toISOString();

      // Ensure baseline version 1 exists in guideline_versions for diffing
      const { data: existingV1 } = await admin
        .from('guideline_versions')
        .select('id')
        .eq('guideline_id', guideline.id)
        .eq('version', guideline.version || 1)
        .maybeSingle();

      if (!existingV1) {
        await admin.from('guideline_versions').insert({
          id: crypto.randomUUID(),
          guideline_id: guideline.id,
          version: guideline.version || 1,
          title: guideline.title,
          body: guideline.body,
          clarification: guideline.clarification,
          changed_by: guideline.created_by,
          change_note: 'Initial baseline guideline',
          created_at: guideline.created_at || new Date().toISOString(),
        });
      }

      // Record new revision in guideline_versions table
      await admin.from('guideline_versions').insert({
        id: crypto.randomUUID(),
        guideline_id: guideline.id,
        version: newVersion,
        title: guideline.title,
        body: guideline.body,
        clarification: proposal.proposed_text,
        changed_by: user.id,
        change_note: proposal.reason || 'Clarification adopted from insight proposal',
        created_at: appliedAt,
      });

      // Update guideline clarification and version
      const { error: updateGError } = await admin
        .from('guidelines')
        .update({
          clarification: proposal.proposed_text,
          version: newVersion,
          updated_at: appliedAt,
        })
        .eq('id', guideline.id);

      if (updateGError) {
        return NextResponse.json(
          { error: `Failed to update guideline: ${updateGError.message}` },
          { status: 500 }
        );
      }

      // Update proposal status with applied_at timestamp
      await admin
        .from('guideline_proposals')
        .update({
          status: 'approved',
          decided_by: user.id,
          applied_at: appliedAt,
        })
        .eq('id', proposalId);

      // Audit log
      await logAudit({
        org_id: profile.org_id,
        actor: user.id,
        action: 'guideline.proposal.approved',
        detail: {
          proposal_id: proposalId,
          guideline_id: guideline.id,
          guideline_title: guideline.title,
          previous_version: guideline.version,
          new_version: newVersion,
          clarification_preview: proposal.proposed_text.slice(0, 150),
        },
      });

      return NextResponse.json({
        success: true,
        status: 'approved',
        new_version: newVersion,
      });
    } else {
      // Reject proposal
      await admin
        .from('guideline_proposals')
        .update({
          status: 'rejected',
          decided_by: user.id,
        })
        .eq('id', proposalId);

      // Audit log
      await logAudit({
        org_id: profile.org_id,
        actor: user.id,
        action: 'guideline.proposal.rejected',
        detail: {
          proposal_id: proposalId,
          guideline_id: proposal.guideline_id,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'rejected',
      });
    }
  } catch (err: unknown) {
    console.error('Error handling proposal decision:', err);
    const errorObj = err as { message?: string; status?: number };
    return NextResponse.json(
      { error: errorObj.message || 'Failed to process decision' },
      { status: errorObj.status || 500 }
    );
  }
}
