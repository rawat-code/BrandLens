import { getAdminClient } from '@/lib/supabase/admin';
import { runRuleChecks } from '@/lib/review/rules';
import { logAudit } from '@/lib/audit';
import type { Finding, Content, ContentVersion, Guideline, Fact, Term } from '@/lib/types';

export interface ReviewResult {
  findings: Finding[];
  content: Content;
  version: ContentVersion;
  aiUnavailable: boolean;
}

/**
 * Executes the brand review pipeline for the specified content record.
 * Handles deterministic rules and enforces confidential flags and audit logging.
 */
export async function runReview(contentId: string, actorId: string): Promise<ReviewResult> {
  const admin = getAdminClient();

  // 1. Fetch content
  const { data: contentData, error: contentError } = await admin
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single();

  if (contentError || !contentData) {
    throw new Error(`Content not found: ${contentError?.message || contentId}`);
  }
  const content = contentData as Content;

  // 2. Fetch latest version
  const { data: versionData, error: versionError } = await admin
    .from('content_versions')
    .select('*')
    .eq('content_id', contentId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (versionError || !versionData) {
    throw new Error(`Content version not found: ${versionError?.message}`);
  }
  const version = versionData as ContentVersion;

  // 3. Fetch governance library items for the organization
  const [
    { data: guidelinesData },
    { data: factsData },
    { data: termsData },
  ] = await Promise.all([
    admin.from('guidelines').select('*').eq('org_id', content.org_id),
    admin.from('facts').select('*').eq('org_id', content.org_id),
    admin.from('terms').select('*').eq('org_id', content.org_id),
  ]);

  const guidelines = (guidelinesData as Guideline[]) || [];
  const facts = (factsData as Fact[]) || [];
  const terms = (termsData as Term[]) || [];

  // 4. Run deterministic rule-based checks
  const ruleFindings = runRuleChecks({
    contentId: content.id,
    version: version.version,
    body: version.body,
    terms,
    guidelines,
    facts,
  });

  // 5. Delete previous open findings for this content version
  await admin
    .from('findings')
    .delete()
    .eq('content_id', content.id)
    .eq('version', version.version);

  // 6. Insert new findings into the database
  let savedFindings: Finding[] = [];
  if (ruleFindings.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from('findings')
      .insert(ruleFindings)
      .select();

    if (insertError) {
      console.error('Failed to store findings:', insertError);
    } else {
      savedFindings = (inserted as Finding[]) || [];
    }
  }

  // 7. Transition status from 'draft' or 'needs_changes' to 'ai_reviewed'
  if (content.status === 'draft' || content.status === 'needs_changes') {
    await admin
      .from('contents')
      .update({ status: 'ai_reviewed', updated_at: new Date().toISOString() })
      .eq('id', content.id);
    content.status = 'ai_reviewed';
  }

  // 8. Record audit log entry
  await logAudit({
    org_id: content.org_id,
    actor: actorId,
    action: 'content.review',
    content_id: content.id,
    detail: {
      version: version.version,
      findings_count: savedFindings.length,
      confidential: content.confidential,
      high_severity_count: savedFindings.filter((f) => f.severity === 'high').length,
    },
  });

  return {
    findings: savedFindings,
    content,
    version,
    aiUnavailable: false,
  };
}
