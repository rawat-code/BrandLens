import type { Term, Guideline, Fact, Finding } from '@/lib/types';

export interface RuleCheckParams {
  contentId: string;
  version: number;
  body: string;
  terms: Term[];
  guidelines: Guideline[];
  facts: Fact[];
}

/**
 * Deterministic rule-based evaluation engine.
 * Adheres strictly to Non-negotiable product rule 1:
 * "NO SOURCE, NO FLAG. Every finding must cite a guideline, fact or term from the organisation's library."
 */
export function runRuleChecks({
  contentId,
  version,
  body,
  terms,
  guidelines,
  facts,
}: RuleCheckParams): Omit<Finding, 'id' | 'created_at'>[] {
  const findings: Omit<Finding, 'id' | 'created_at'>[] = [];
  const lowerBody = body.toLowerCase();

  // Helper to find guideline by category or keyword
  const findGuideline = (category: string, keyword?: string): Guideline | undefined => {
    return (
      guidelines.find((g) => g.category.toLowerCase() === category.toLowerCase()) ||
      (keyword
        ? guidelines.find(
            (g) =>
              g.title.toLowerCase().includes(keyword.toLowerCase()) ||
              g.body.toLowerCase().includes(keyword.toLowerCase())
          )
        : undefined)
    );
  };

  const claimGuideline = findGuideline('claim', 'efficacy');
  const toneGuideline = findGuideline('tone', 'urgency');

  // 1. Terminology checks (Banned and Caution terms)
  for (const termItem of terms) {
    const rawTerm = termItem.term.trim();
    if (!rawTerm) continue;

    // Use regex to locate whole-word or phrase occurrences
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(body)) !== null) {
      const startIdx = match.index;
      const endIdx = startIdx + match[0].length;
      const excerpt = body.slice(Math.max(0, startIdx - 20), Math.min(body.length, endIdx + 20));

      if (termItem.kind === 'banned') {
        findings.push({
          content_id: contentId,
          version,
          rule_key: `term_banned_${rawTerm.toLowerCase().replace(/\s+/g, '_')}`,
          origin: 'rule',
          category: 'terminology',
          severity: 'high',
          confidence: 1.0,
          excerpt,
          start_idx: startIdx,
          end_idx: endIdx,
          reason:
            termItem.note ||
            `The term "${rawTerm}" is banned under Verdant Skin compliance standards.`,
          source_type: 'term',
          source_id: termItem.id,
          source_quote: termItem.term,
          suggestion: termItem.replacement || null,
          intent_check: termItem.replacement ? 'preserved' : null,
          intent_note: termItem.replacement
            ? `Replaces banned term with approved synonym "${termItem.replacement}".`
            : null,
          needs_human_check: false,
          requires_reviewer: true, // High severity requires reviewer approval
          status: 'open',
          dispute_reason: null,
        });
      } else if (termItem.kind === 'caution') {
        findings.push({
          content_id: contentId,
          version,
          rule_key: `term_caution_${rawTerm.toLowerCase().replace(/\s+/g, '_')}`,
          origin: 'rule',
          category: 'terminology',
          severity: 'medium',
          confidence: 0.9,
          excerpt,
          start_idx: startIdx,
          end_idx: endIdx,
          reason:
            termItem.note ||
            `"${rawTerm}" is flagged as a caution term. Provide context or botanical source.`,
          source_type: 'term',
          source_id: termItem.id,
          source_quote: termItem.term,
          suggestion: termItem.replacement || null,
          intent_check: termItem.replacement ? 'preserved' : null,
          intent_note: null,
          needs_human_check: false,
          requires_reviewer: false,
          status: 'open',
          dispute_reason: null,
        });
      }
    }
  }

  // 2. Claim Guardrails (100% guarantees, cures, miraculous claims)
  if (claimGuideline) {
    const claimPatterns = [
      { regex: /\b(100%|guaranteed\s+results?)\b/gi, msg: 'Claims of 100% results or absolute guarantees violate cosmetic advertising standards.' },
      { regex: /\b(miracle|cures?|eradicates?)\b/gi, msg: 'Cosmetics cannot claim to cure medical dermatological conditions.' },
    ];

    for (const pattern of claimPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.regex.exec(body)) !== null) {
        const startIdx = m.index;
        const endIdx = startIdx + m[0].length;

        // Avoid duplicate findings if already caught by term check
        const alreadyFlagged = findings.some(
          (f) => f.start_idx === startIdx && f.end_idx === endIdx
        );

        if (!alreadyFlagged) {
          findings.push({
            content_id: contentId,
            version,
            rule_key: 'claim_policy_violation',
            origin: 'rule',
            category: 'claim',
            severity: 'high',
            confidence: 0.95,
            excerpt: body.slice(Math.max(0, startIdx - 20), Math.min(body.length, endIdx + 20)),
            start_idx: startIdx,
            end_idx: endIdx,
            reason: pattern.msg,
            source_type: 'guideline',
            source_id: claimGuideline.id,
            source_quote: claimGuideline.title,
            suggestion: 'visibly supports healthy skin appearance',
            intent_check: 'preserved',
            intent_note: 'Maintains efficacy messaging without deceptive medical guarantees.',
            needs_human_check: false,
            requires_reviewer: true,
            status: 'open',
            dispute_reason: null,
          });
        }
      }
    }
  }

  // 3. Tone Guardrails (Aggressive urgency tactics)
  if (toneGuideline) {
    const urgencyRegex = /\b(buy now before gone|act now before|hurry|don't miss out|order now!)\b/gi;
    let tm: RegExpExecArray | null;
    while ((tm = urgencyRegex.exec(body)) !== null) {
      const startIdx = tm.index;
      const endIdx = startIdx + tm[0].length;

      findings.push({
        content_id: contentId,
        version,
        rule_key: 'tone_urgency_violation',
        origin: 'rule',
        category: 'tone',
        severity: 'medium',
        confidence: 0.9,
        excerpt: body.slice(Math.max(0, startIdx - 15), Math.min(body.length, endIdx + 15)),
        start_idx: startIdx,
        end_idx: endIdx,
        reason:
          'Aggressive urgency tactics conflict with Verdant Skin warm, informative tone.',
        source_type: 'guideline',
        source_id: toneGuideline.id,
        source_quote: toneGuideline.title,
        suggestion: 'Explore our routine today',
        intent_check: 'preserved',
        intent_note: 'Encourages product discovery without manufactured pressure.',
        needs_human_check: false,
        requires_reviewer: false,
        status: 'open',
        dispute_reason: null,
      });
    }
  }

  // 4. Expired or Retired Clinical Fact citations
  for (const fact of facts) {
    const isInactive =
      fact.status === 'retired' ||
      (fact.expires_at ? new Date(fact.expires_at) < new Date() : false);

    if (isInactive) {
      // Check if statement keyword exists in body
      const keywords = fact.statement.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
      const matchCount = keywords.filter((k) => lowerBody.includes(k)).length;

      if (matchCount >= 2 && keywords.length >= 2) {
        findings.push({
          content_id: contentId,
          version,
          rule_key: `fact_inactive_${fact.id.slice(0, 8)}`,
          origin: 'rule',
          category: 'fact',
          severity: 'high',
          confidence: 0.85,
          excerpt: fact.statement.slice(0, 50) + '...',
          start_idx: null,
          end_idx: null,
          reason: `Copy appears to cite an inactive or retired fact ("${fact.statement}").`,
          source_type: 'fact',
          source_id: fact.id,
          source_quote: fact.statement,
          suggestion: null,
          intent_check: null,
          intent_note: null,
          needs_human_check: true,
          requires_reviewer: true,
          status: 'open',
          dispute_reason: null,
        });
      }
    }
  }

  return findings;
}
