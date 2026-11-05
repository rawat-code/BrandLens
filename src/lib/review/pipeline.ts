import { getAdminClient } from '@/lib/supabase/admin';
import { runRuleChecks } from '@/lib/review/rules';
import { redact } from '@/lib/review/redact';
import { retrieve } from '@/lib/review/retrieve';
import { judgeContentWithAi } from '@/lib/review/judge';
import { enrichFindingsWithSuggestionsAndIntent } from '@/lib/review/suggest';
import { logAudit } from '@/lib/audit';
import type { Finding, Content, ContentVersion, Guideline, Fact, Term } from '@/lib/types';

export interface ReviewResult {
  status: Content['status'];
  findings: Finding[];
  content: Content;
  version: ContentVersion;
  aiUnavailable: boolean;
  aiRun?: {
    used_ai: boolean;
    skipped_reason?: string | null;
    rule_count: number;
    ai_count: number;
    redactions: number;
    model?: string | null;
  };
}

/**
 * Executes the brand review pipeline for the specified content record.
 * 1. Runs deterministic rules (always).
 * 2. If confidential or missing AI credentials, skips AI safely.
 * 3. Otherwise runs AI judge and batched intent-check suggestions.
 * 4. Gracefully degrades to rule-based findings on AI failure.
 * 5. Atomically persists findings, writes ai_runs record, updates status, and logs audit event.
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

  // 2. Fetch current version
  const { data: versionData, error: versionError } = await admin
    .from('content_versions')
    .select('*')
    .eq('content_id', contentId)
    .eq('version', content.current_version)
    .single();

  if (versionError || !versionData) {
    throw new Error(`Content version not found: ${versionError?.message || content.current_version}`);
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

  // Approved, unexpired facts for AI grounding
  const approvedFacts = facts.filter(
    (f) =>
      f.status === 'approved' &&
      (!f.expires_at || new Date(f.expires_at).getTime() >= Date.now())
  );

  // 4. Run deterministic rules FIRST (always)
  const ruleFindings = runRuleChecks({
    contentId: content.id,
    version: version.version,
    body: version.body,
    terms,
    guidelines,
    facts,
  });

  let used_ai = false;
  let skipped_reason: string | null = null;
  let redactionsCount = 0;
  let sentPreview: string | null = null;
  let model: string | null = null;
  let aiError: string | null = null;
  let aiUnavailable = false;
  let aiFindings: Omit<Finding, 'id' | 'created_at'>[] = [];

  // 5. Evaluate whether to run AI
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY);

  if (content.confidential) {
    used_ai = false;
    skipped_reason = 'confidential_content';
  } else if (!apiKeyPresent) {
    used_ai = false;
    skipped_reason = 'missing_gemini_api_key';
    aiUnavailable = true;
  } else {
    // Content is non-confidential and AI credentials exist
    try {
      // 5a. Redact PII
      const redactionResult = redact(version.body);
      redactionsCount = redactionResult.count;
      sentPreview = redactionResult.redactedText.slice(0, 500);

      // 5b. Retrieve relevant guideline chunks
      const sentences = version.body
        .split(/[.!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const retrievedChunks = retrieve(sentences, guidelines, approvedFacts, terms);

      // 5c. Run AI Judge
      const judgeResult = await judgeContentWithAi({
        contentId: content.id,
        version: version.version,
        originalText: version.body,
        redactedText: redactionResult.redactedText,
        mappings: redactionResult.mappings,
        retrievedChunks,
        facts: approvedFacts,
        terms,
        ruleFindings,
      });

      used_ai = true;
      model = judgeResult.model;
      aiFindings = judgeResult.findings;
    } catch (err) {
      console.warn('AI review call failed, degrading gracefully to rule findings:', (err as Error).message);
      used_ai = false;
      skipped_reason = 'ai_service_error';
      aiError = (err as Error).message;
      aiUnavailable = true;
    }
  }

  // 6. Combine findings and run batched suggestions / intent check if AI is available
  let combinedFindings = [...ruleFindings, ...aiFindings];
  if (used_ai) {
    try {
      combinedFindings = await enrichFindingsWithSuggestionsAndIntent(combinedFindings, {
        skipAi: !used_ai,
      });
    } catch (enrichErr) {
      console.warn('Intent check failed, keeping existing findings:', (enrichErr as Error).message);
    }
  }

  // 7. Persist findings to database (replace previous for this version)
  await admin
    .from('findings')
    .delete()
    .eq('content_id', content.id)
    .eq('version', version.version);

  let savedFindings: Finding[] = [];
  if (combinedFindings.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from('findings')
      .insert(combinedFindings)
      .select();

    if (insertError) {
      console.error('Failed to store findings:', insertError);
      throw new Error(`Failed to save findings: ${insertError.message}`);
    }
    savedFindings = (inserted as Finding[]) || [];
  }

  // 8. Record ai_runs entry
  const { error: aiRunError } = await admin.from('ai_runs').insert({
    content_id: content.id,
    version: version.version,
    model: model || (used_ai ? (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite') : null),
    used_ai,
    skipped_reason,
    redactions: redactionsCount,
    sent_preview: sentPreview,
    rule_count: ruleFindings.length,
    ai_count: aiFindings.length,
    error: aiError,
  });

  if (aiRunError) {
    console.error('Failed to log ai_run:', aiRunError);
  }

  // 9. Update content status:
  // "set status to ai_reviewed (or needs_changes if any open high finding)"
  const hasOpenHighFinding = savedFindings.some(
    (f) => f.severity === 'high' && f.status === 'open'
  );
  const nextStatus = hasOpenHighFinding ? 'needs_changes' : 'ai_reviewed';

  await admin
    .from('contents')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', content.id);

  content.status = nextStatus;

  // 10. Write audit log entry
  await logAudit({
    org_id: content.org_id,
    actor: actorId,
    action: 'content.review',
    content_id: content.id,
    detail: {
      version: version.version,
      status: nextStatus,
      rule_count: ruleFindings.length,
      ai_count: aiFindings.length,
      used_ai,
      skipped_reason,
      high_severity_count: savedFindings.filter((f) => f.severity === 'high').length,
      confidential: content.confidential,
      ai_unavailable: aiUnavailable,
    },
  });

  return {
    status: nextStatus,
    findings: savedFindings,
    content,
    version,
    aiUnavailable,
    aiRun: {
      used_ai,
      skipped_reason,
      rule_count: ruleFindings.length,
      ai_count: aiFindings.length,
      redactions: redactionsCount,
      model,
    },
  };
}
