import type { Guideline, Fact, Term } from '@/lib/types';

export interface ConflictSource {
  type: 'guideline' | 'fact' | 'term';
  id: string;
  title: string;
  excerpt: string;
}

export interface PossibleConflict {
  id: string;
  topic: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  sourceA: ConflictSource;
  sourceB: ConflictSource;
}

// Tokenize text into keywords, ignoring short words and common stop words
function extractKeywords(text: string): string[] {
  const STOPWORDS = new Set([
    'the', 'and', 'a', 'to', 'of', 'in', 'is', 'for', 'with', 'that', 'our', 'all', 'by', 'on', 'as',
    'it', 'be', 'are', 'this', 'from', 'at', 'an', 'your', 'or', 'we', 'will', 'must', 'can', 'should'
  ]);
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  return Array.from(new Set(words.filter((w) => !STOPWORDS.has(w))));
}

// Negative markers
const NEGATIVE_MARKERS = [
  'never',
  'no',
  'cannot',
  'not',
  'without',
  'prohibit',
  'forbidden',
  'banned',
  'avoid',
  'do not',
  "don't",
];

// Positive markers
const POSITIVE_MARKERS = ['always', 'emphasize', 'highlight', 'feature', 'include', 'ensure', 'encourage'];

function getPolarity(text: string): 'negative' | 'positive' | 'neutral' {
  const lower = text.toLowerCase();
  const hasNeg = NEGATIVE_MARKERS.some((m) => new RegExp(`\\b${m}\\b`, 'i').test(lower));
  const hasPos = POSITIVE_MARKERS.some((m) => new RegExp(`\\b${m}\\b`, 'i').test(lower));

  // If both are present, check which appears at key positions (e.g. "never ...", "must avoid ...")
  if (hasNeg && !hasPos) return 'negative';
  if (hasPos && !hasNeg) return 'positive';
  if (hasNeg && hasPos) {
    if (lower.startsWith('never') || lower.includes('must avoid') || lower.includes('do not')) {
      return 'negative';
    }
    return 'neutral';
  }
  return 'neutral';
}

/**
 * Pure deterministic contradiction detector across guidelines, facts, and terms.
 * Surfaces "Possible conflicts", explicitly labeled as possible to encourage human review.
 */
export function detectConflicts({
  guidelines,
  facts,
  terms,
}: {
  guidelines: Guideline[];
  facts: Fact[];
  terms: Term[];
}): PossibleConflict[] {
  const conflicts: PossibleConflict[] = [];
  let conflictCounter = 1;

  // 1. Contradictions between guidelines and banned/caution terms
  // Example: Guideline advises using/highlighting a term that is banned in terminology dictionary
  for (const term of terms) {
    if (term.kind !== 'banned' && term.kind !== 'caution') continue;
    const termLower = term.term.toLowerCase();

    for (const g of guidelines) {
      const gText = `${g.title} ${g.body} ${g.clarification || ''}`.toLowerCase();
      // If guideline recommends or encourages the banned word (and NOT "avoid" or "never")
      const recommendsPattern = new RegExp(`(?:always|should|include|use|emphasize|highlight|feature)\\s+[^.]*\\b${termLower}\\b`, 'i');
      const avoidPattern = new RegExp(`(?:avoid|never|prohibit|banned|not)\\s+[^.]*\\b${termLower}\\b`, 'i');

      if (recommendsPattern.test(gText) && !avoidPattern.test(gText)) {
        conflicts.push({
          id: `conflict-${conflictCounter++}`,
          topic: `Terminology conflict on "${term.term}"`,
          reason: `Guideline "${g.title}" advises using or emphasizing "${term.term}", but terminology defines it as a ${term.kind} term (${term.note || 'restricted'}).`,
          severity: term.kind === 'banned' ? 'high' : 'medium',
          sourceA: {
            type: 'guideline',
            id: g.id,
            title: g.title,
            excerpt: g.body.slice(0, 160),
          },
          sourceB: {
            type: 'term',
            id: term.id,
            title: `Term: "${term.term}" (${term.kind})`,
            excerpt: term.note || `Replacement: ${term.replacement || 'None'}`,
          },
        });
      }
    }
  }

  // 2. Contradictions between guidelines and clinical facts
  // Example: Guideline restricts claims (e.g. guarantees/cure) that a fact purports to claim, or vice versa
  for (const fact of facts) {
    if (fact.status === 'retired') continue;
    const factLower = fact.statement.toLowerCase();

    for (const g of guidelines) {
      const gLower = `${g.title} ${g.body}`.toLowerCase();

      // Check for absolute claims in fact when guideline forbids them
      const factHasAbsolute = /\b(guaranteed?|cure|100%|magic)\b/i.test(factLower);
      const guidelineForbidsAbsolute = /\b(never|avoid|prohibit|cannot)\s+[^.]*\b(guarantee|cure|results|claims)\b/i.test(gLower);

      if (factHasAbsolute && guidelineForbidsAbsolute) {
        conflicts.push({
          id: `conflict-${conflictCounter++}`,
          topic: `Claim governance tension on clinical statement`,
          reason: `Guideline "${g.title}" specifies restrictive policy against absolute claims, while approved fact states: "${fact.statement}". Verify compliance scope.`,
          severity: 'high',
          sourceA: {
            type: 'guideline',
            id: g.id,
            title: g.title,
            excerpt: g.body.slice(0, 160),
          },
          sourceB: {
            type: 'fact',
            id: fact.id,
            title: `Clinical Fact (${fact.status})`,
            excerpt: fact.statement,
          },
        });
        continue;
      }

      // Check for opposing polarities on shared core topic words
      const gKeywords = extractKeywords(gLower);
      const factKeywords = extractKeywords(factLower);
      const shared = gKeywords.filter((k) => factKeywords.includes(k));

      if (shared.length >= 2) {
        const gPolarity = getPolarity(gLower);
        const fPolarity = getPolarity(factLower);

        if ((gPolarity === 'negative' && fPolarity === 'positive') || (gPolarity === 'positive' && fPolarity === 'negative')) {
          conflicts.push({
            id: `conflict-${conflictCounter++}`,
            topic: `Claim governance tension on ${shared.slice(0, 3).join(', ')}`,
            reason: `Guideline "${g.title}" specifies restrictive policy on "${shared.join(', ')}", while approved fact states: "${fact.statement}". Verify compliance scope.`,
            severity: 'medium',
            sourceA: {
              type: 'guideline',
              id: g.id,
              title: g.title,
              excerpt: g.body.slice(0, 160),
            },
            sourceB: {
              type: 'fact',
              id: fact.id,
              title: `Clinical Fact (${fact.status})`,
              excerpt: fact.statement,
            },
          });
        }
      }
    }
  }

  // 3. Contradictions between pairs of guidelines with opposing polarities
  for (let i = 0; i < guidelines.length; i++) {
    for (let j = i + 1; j < guidelines.length; j++) {
      const gA = guidelines[i];
      const gB = guidelines[j];

      const keywordsA = extractKeywords(gA.body);
      const keywordsB = extractKeywords(gB.body);
      const overlap = keywordsA.filter((k) => keywordsB.includes(k));

      if (overlap.length >= 2) {
        const polA = getPolarity(gA.body);
        const polB = getPolarity(gB.body);

        if ((polA === 'negative' && polB === 'positive') || (polA === 'positive' && polB === 'negative')) {
          conflicts.push({
            id: `conflict-${conflictCounter++}`,
            topic: `Opposing polarities between "${gA.title}" and "${gB.title}"`,
            reason: `Both guidelines govern shared concepts (${overlap.slice(0, 3).join(', ')}) but convey opposing positive vs negative mandates. Review for brand alignment.`,
            severity: 'medium',
            sourceA: {
              type: 'guideline',
              id: gA.id,
              title: gA.title,
              excerpt: gA.body.slice(0, 160),
            },
            sourceB: {
              type: 'guideline',
              id: gB.id,
              title: gB.title,
              excerpt: gB.body.slice(0, 160),
            },
          });
        }
      }
    }
  }

  return conflicts;
}
