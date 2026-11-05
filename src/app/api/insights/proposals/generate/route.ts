import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { generateGuidelineClarification } from '@/lib/ai/clarify';
import { z } from 'zod';

const RequestSchema = z.object({
  guideline_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await requireRole(['manager', 'admin']);
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: guideline_id (UUID) is required' },
        { status: 400 }
      );
    }

    const { guideline_id } = parsed.data;
    const admin = getAdminClient();

    // 1. Fetch target guideline
    const { data: guideline, error: gError } = await admin
      .from('guidelines')
      .select('*')
      .eq('id', guideline_id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (gError || !guideline) {
      return NextResponse.json(
        { error: 'Guideline not found in this organization' },
        { status: 404 }
      );
    }

    // 2. Fetch findings associated with this guideline for dispute context
    const { data: findings } = await admin
      .from('findings')
      .select('excerpt, dispute_reason, status')
      .eq('source_id', guideline_id);

    const disputeReasons: string[] = [];
    const excerpts: string[] = [];

    if (findings) {
      for (const f of findings) {
        if (f.dispute_reason?.trim()) {
          disputeReasons.push(f.dispute_reason.trim());
        }
        if (f.excerpt?.trim()) {
          excerpts.push(f.excerpt.trim());
        }
      }
    }

    // 3. Generate AI clarification proposal
    const aiProposal = await generateGuidelineClarification({
      guideline,
      disputeReasons,
      excerpts,
    });

    let fullProposedText = aiProposal.proposed_text;
    if (aiProposal.examples && aiProposal.examples.length > 0) {
      fullProposedText += '\n\nExamples:\n' + aiProposal.examples.map((ex) => `• ${ex}`).join('\n');
    }

    // 4. Store proposal in guideline_proposals table with status 'pending'
    const { data: newProposal, error: pError } = await admin
      .from('guideline_proposals')
      .insert({
        org_id: profile.org_id,
        guideline_id,
        rule_key: null,
        proposed_text: fullProposedText,
        reason: aiProposal.reason,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (pError || !newProposal) {
      return NextResponse.json(
        { error: `Failed to save guideline proposal: ${pError?.message}` },
        { status: 500 }
      );
    }

    // 5. Append audit log
    await logAudit({
      org_id: profile.org_id,
      actor: user.id,
      action: 'guideline.proposal.generated',
      detail: {
        guideline_id,
        guideline_title: guideline.title,
        proposal_id: newProposal.id,
        reason: aiProposal.reason,
      },
    });

    return NextResponse.json({
      success: true,
      proposal: newProposal,
    });
  } catch (err: unknown) {
    console.error('Error generating guideline proposal:', err);
    const errorObj = err as { message?: string; status?: number };
    return NextResponse.json(
      { error: errorObj.message || 'Failed to generate proposal' },
      { status: errorObj.status || 500 }
    );
  }
}
