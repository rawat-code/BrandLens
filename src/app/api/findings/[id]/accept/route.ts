import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { Finding, Content, ContentVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: findingId } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);
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

    // 3. Org boundary & Creator check
    if (content.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden: Content belongs to a different org' }, { status: 403 });
    }
    if (profile.role === 'creator' && content.created_by !== profile.id) {
      return NextResponse.json({ error: 'Creators can only modify their own content' }, { status: 403 });
    }

    // Concurrency protection: prevent double-accepting or accepting already resolved findings
    if (finding.status !== 'open') {
      return NextResponse.json(
        { error: `Conflict: Finding has already been marked "${finding.status}". Please refresh the review.` },
        { status: 409 }
      );
    }

    const requestJson = await _req.json().catch(() => ({}));
    const appliedSuggestion = (
      typeof requestJson.custom_suggestion === 'string' && requestJson.custom_suggestion.trim()
        ? requestJson.custom_suggestion.trim()
        : finding.suggestion
    );

    if (!appliedSuggestion) {
      return NextResponse.json({ error: 'This finding has no suggestion to apply' }, { status: 400 });
    }

    const overrideReason =
      typeof requestJson.override_reason === 'string' && requestJson.override_reason.trim()
        ? requestJson.override_reason.trim()
        : typeof requestJson.intent_override_reason === 'string' && requestJson.intent_override_reason.trim()
        ? requestJson.intent_override_reason.trim()
        : null;

    // Enforce justification override if intent may have changed
    if (finding.intent_check === 'changed' && !overrideReason) {
      return NextResponse.json(
        {
          error:
            'This suggestion alters original meaning. An explicit override justification is required to accept anyway.',
        },
        { status: 400 }
      );
    }

    // 4. Fetch current version body
    const { data: versionData, error: versionError } = await admin
      .from('content_versions')
      .select('*')
      .eq('content_id', content.id)
      .eq('version', content.current_version)
      .single();

    if (versionError || !versionData) {
      return NextResponse.json({ error: 'Current version not found' }, { status: 404 });
    }
    const currentVersion = versionData as ContentVersion;
    let newBody = currentVersion.body;

    // 5. Replace text with suggestion
    if (
      typeof finding.start_idx === 'number' &&
      typeof finding.end_idx === 'number' &&
      finding.start_idx >= 0 &&
      finding.end_idx <= newBody.length
    ) {
      newBody =
        newBody.slice(0, finding.start_idx) +
        appliedSuggestion +
        newBody.slice(finding.end_idx);
    } else if (finding.excerpt && newBody.includes(finding.excerpt)) {
      newBody = newBody.replace(finding.excerpt, appliedSuggestion);
    } else if (finding.source_quote && newBody.includes(finding.source_quote)) {
      newBody = newBody.replace(finding.source_quote, appliedSuggestion);
    }

    // 6. Create next version
    const nextVersion = (content.current_version || 1) + 1;
    const { data: newVersionRow, error: newVerError } = await admin
      .from('content_versions')
      .insert({
        content_id: content.id,
        version: nextVersion,
        body: newBody,
        created_by: profile.id,
        note: `Applied suggestion for ${finding.rule_key}`,
      })
      .select()
      .single();

    if (newVerError) {
      return NextResponse.json({ error: newVerError.message }, { status: 500 });
    }

    // 7. Update contents.current_version and reset status to draft
    await admin
      .from('contents')
      .update({
        current_version: nextVersion,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id);

    // 8. Mark finding as accepted
    await admin
      .from('findings')
      .update({
        status: 'accepted',
        suggestion: appliedSuggestion,
        intent_override_reason: overrideReason,
      })
      .eq('id', finding.id);

    // 9. Log audit
    const actionName = overrideReason ? 'finding.accept_override' : 'finding.accept';
    await logAudit({
      org_id: content.org_id,
      actor: profile.id,
      action: actionName,
      content_id: content.id,
      detail: {
        finding_id: finding.id,
        rule_key: finding.rule_key,
        override_reason: overrideReason,
        previous_version: content.current_version,
        new_version: nextVersion,
      },
    });

    return NextResponse.json({
      success: true,
      finding_id: finding.id,
      new_version: newVersionRow,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Accept finding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

