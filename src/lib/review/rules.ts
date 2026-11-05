import type { Term, Guideline, Fact, Finding, FindingSeverity } from '@/lib/types';

export interface RuleCheckParams {
  contentId: string;
  version: number;
  body: string;
  terms: Term[];
  guidelines: Guideline[];
  facts: Fact[];
}

export const CLAIM_LEXICAL_OVERLAP_THRESHOLD = 0.45;

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does',
  'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'she', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'were', 'weren\'t', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export function tokenizeWithoutStopwords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9%]+/g) || []).filter(
    (t) => !STOPWORDS.has(t) && t.length > 1
  );
}

export function calculateLexicalOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let shared = 0;
  for (const t of new Set(tokensA)) {
    if (setB.has(t)) shared++;
  }
  return shared / Math.min(new Set(tokensA).size, setB.size);
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const stripped = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function calculateFleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.match(/\b[A-Za-z]+\b/g) || [];
  if (sentences.length === 0 || words.length === 0) return 0;

  let totalSyllables = 0;
  for (const w of words) totalSyllables += countSyllables(w);

  const grade =
    0.39 * (words.length / sentences.length) + 11.8 * (totalSyllables / words.length) - 15.59;
  return Math.round(grade * 10) / 10;
}

function findGuideline(
  guidelines: Guideline[],
  category: string,
  keywords: string[] = []
): Guideline | undefined {
  const catMatch = guidelines.find(
    (g) => g.category.toLowerCase() === category.toLowerCase()
  );
  if (catMatch) return catMatch;

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const match = guidelines.find(
      (g) =>
        g.title.toLowerCase().includes(kwLower) ||
        g.body.toLowerCase().includes(kwLower)
    );
    if (match) return match;
  }

  return guidelines[0];
}

interface SentenceSpan {
  text: string;
  startIdx: number;
  endIdx: number;
}

function splitIntoSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const regex = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const startOffset = raw.indexOf(trimmed);
      const startIdx = match.index + startOffset;
      const endIdx = startIdx + trimmed.length;
      spans.push({ text: trimmed, startIdx, endIdx });
    }
  }

  return spans;
}

export function runRuleChecks({
  contentId,
  version,
  body,
  terms,
  guidelines,
  facts,
}: RuleCheckParams): Omit<Finding, 'id' | 'created_at'>[] {
  const findings: Omit<Finding, 'id' | 'created_at'>[] = [];

  const claimGuideline = findGuideline(guidelines, 'claim', ['claim', 'messaging', 'transparent']);
  const a11yGuideline = findGuideline(guidelines, 'accessibility', ['accessib', 'digital']);
  const securityGuideline = findGuideline(guidelines, 'security', ['security', 'general']);

  // Helper to create finding adhering strictly to Non-negotiable product rule 1
  const createFinding = (params: {
    rule_key: string;
    category: Finding['category'];
    severity: FindingSeverity;
    confidence: number;
    excerpt: string;
    start_idx: number | null;
    end_idx: number | null;
    reason: string;
    guideline?: Guideline;
    source_type?: Finding['source_type'];
    source_id?: string | null;
    source_quote?: string | null;
    suggestion?: string | null;
    intent_check?: Finding['intent_check'];
    intent_note?: string | null;
    requires_reviewer?: boolean;
  }): Omit<Finding, 'id' | 'created_at'> => {
    let source_type = params.source_type;
    let source_id = params.source_id ?? null;
    let source_quote = params.source_quote ?? null;
    let needs_human_check = false;

    if (!source_type && params.guideline) {
      source_type = 'guideline';
      source_id = params.guideline.id;
      source_quote = params.guideline.title;
    }

    if (!source_type || !source_id) {
      needs_human_check = true;
      source_type = null;
      source_id = null;
      source_quote = null;
    }

    return {
      content_id: contentId,
      version,
      rule_key: params.rule_key,
      origin: 'rule',
      category: params.category,
      severity: params.severity,
      confidence: params.confidence,
      excerpt: params.excerpt,
      start_idx: params.start_idx,
      end_idx: params.end_idx,
      reason: params.reason,
      source_type,
      source_id,
      source_quote,
      suggestion: params.suggestion ?? null,
      intent_check: params.intent_check ?? (params.suggestion ? 'preserved' : null),
      intent_note: params.intent_note ?? null,
      needs_human_check,
      requires_reviewer: params.requires_reviewer ?? (params.severity === 'high'),
      status: 'open',
      dispute_reason: null,
    };
  };

  // =========================================================================
  // 1. Terminology checks
  // =========================================================================
  for (const termItem of terms) {
    const rawTerm = termItem.term.trim();
    if (!rawTerm) continue;

    if (termItem.kind === 'banned') {
      const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(body)) !== null) {
        findings.push(
          createFinding({
            rule_key: 'term.banned',
            category: 'terminology',
            severity: 'high',
            confidence: 1.0,
            excerpt: m[0],
            start_idx: m.index,
            end_idx: m.index + m[0].length,
            reason:
              termItem.note || `"${rawTerm}" is a banned term under compliance standards.`,
            source_type: 'term',
            source_id: termItem.id,
            source_quote: termItem.term,
            suggestion: termItem.replacement || null,
            intent_check: termItem.replacement ? 'preserved' : null,
            intent_note: termItem.replacement
              ? `Replaces banned term with approved term "${termItem.replacement}".`
              : null,
            requires_reviewer: true,
          })
        );
      }
    } else if (termItem.kind === 'caution') {
      const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(body)) !== null) {
        findings.push(
          createFinding({
            rule_key: 'term.caution',
            category: 'terminology',
            severity: 'medium',
            confidence: 0.9,
            excerpt: m[0],
            start_idx: m.index,
            end_idx: m.index + m[0].length,
            reason:
              termItem.note ||
              `"${rawTerm}" is a caution term; provide verified botanical or clinical context.`,
            source_type: 'term',
            source_id: termItem.id,
            source_quote: termItem.term,
            suggestion: termItem.replacement || null,
            intent_check: termItem.replacement ? 'preserved' : null,
            intent_note: null,
            requires_reviewer: false,
          })
        );
      }
    } else if (termItem.kind === 'preferred') {
      // Check for incorrect casing, concatenated forms, or hyphen variants of the preferred term
      const words = rawTerm.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        // Match word sequence ignoring case and whitespace/hyphen differences
        const patternStr = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-_]*');
        const regex = new RegExp(`\\b${patternStr}\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(body)) !== null) {
          // If the match does NOT match exact preferred casing and spacing
          if (m[0] !== rawTerm) {
            findings.push(
              createFinding({
                rule_key: 'term.preferred_variant',
                category: 'terminology',
                severity: 'low',
                confidence: 0.95,
                excerpt: m[0],
                start_idx: m.index,
                end_idx: m.index + m[0].length,
                reason: `Use the preferred brand spelling and capitalization "${rawTerm}".`,
                source_type: 'term',
                source_id: termItem.id,
                source_quote: termItem.term,
                suggestion: rawTerm,
                intent_check: 'preserved',
                intent_note: `Standardizes brand naming to "${rawTerm}".`,
                requires_reviewer: false,
              })
            );
          }
        }
      }
    }
  }

  // =========================================================================
  // 2. Absolute Claims
  // =========================================================================
  const absoluteClaimRegex =
    /\b(100%|guarantee|guaranteed|cures?|miracle|miraculous|instantly|instant|clinically proven)\b/gi;
  let am: RegExpExecArray | null;
  while ((am = absoluteClaimRegex.exec(body)) !== null) {
    findings.push(
      createFinding({
        rule_key: 'claim.absolute',
        category: 'claim',
        severity: 'high',
        confidence: 0.95,
        excerpt: am[0],
        start_idx: am.index,
        end_idx: am.index + am[0].length,
        reason: `Absolute claim "${am[0]}" violates cosmetic advertising standards.`,
        guideline: claimGuideline,
        suggestion: 'visibly supports healthy-looking skin',
        intent_check: 'preserved',
        intent_note: 'Replaces absolute medical claim with approved cosmetic benefit.',
        requires_reviewer: true,
      })
    );
  }

  // =========================================================================
  // 3. Claims Verification (sentences with timeframe, numeric, or absolute claims)
  // =========================================================================
  const timeframeRegex = /\b(?:in|within)\s+\d+\s+(?:days?|weeks?|hours?)\b|\bovernight\b/i;
  const numericClaimRegex = /\b\d+(?:\.\d+)?%\b|\b\d+\s+out\s+of\s+\d+\b|\b\d+x\b/i;

  const sentences = splitIntoSentences(body);

  for (const sentence of sentences) {
    const hasTimeframe = timeframeRegex.test(sentence.text);
    const hasNumeric = numericClaimRegex.test(sentence.text);
    const hasAbsolute = absoluteClaimRegex.test(sentence.text);

    // If the sentence makes a claim, evaluate against facts
    if (hasTimeframe || hasNumeric || hasAbsolute) {
      const sentenceTokens = tokenizeWithoutStopwords(sentence.text);

      let bestApprovedOverlap = 0;
      let bestExpiredOverlap = 0;
      let matchedExpiredFact: Fact | undefined;

      for (const fact of facts) {
        const factTokens = tokenizeWithoutStopwords(fact.statement);
        const overlap = calculateLexicalOverlap(sentenceTokens, factTokens);

        const isExpired =
          fact.status === 'retired' ||
          (fact.expires_at ? new Date(fact.expires_at).getTime() < Date.now() : false);

        if (isExpired) {
          if (overlap > bestExpiredOverlap) {
            bestExpiredOverlap = overlap;
            matchedExpiredFact = fact;
          }
        } else if (fact.status === 'approved') {
          if (overlap > bestApprovedOverlap) {
            bestApprovedOverlap = overlap;
          }
        }
      }

      if (bestApprovedOverlap >= CLAIM_LEXICAL_OVERLAP_THRESHOLD) {
        // Supported -> no finding!
      } else if (
        matchedExpiredFact &&
        bestExpiredOverlap >= CLAIM_LEXICAL_OVERLAP_THRESHOLD
      ) {
        // Matches only an expired fact -> fact.expired
        findings.push(
          createFinding({
            rule_key: 'fact.expired',
            category: 'fact',
            severity: 'medium',
            confidence: 0.9,
            excerpt: sentence.text,
            start_idx: sentence.startIdx,
            end_idx: sentence.endIdx,
            reason: `Claim references data from a fact that expired on ${
              matchedExpiredFact.expires_at || 'past date'
            } ("${matchedExpiredFact.statement}").`,
            source_type: 'fact',
            source_id: matchedExpiredFact.id,
            source_quote: matchedExpiredFact.statement,
            suggestion: null,
            requires_reviewer: false,
          })
        );
      } else {
        // Unsupported -> claim.unsupported
        findings.push(
          createFinding({
            rule_key: 'claim.unsupported',
            category: 'claim',
            severity: 'high',
            confidence: 0.9,
            excerpt: sentence.text,
            start_idx: sentence.startIdx,
            end_idx: sentence.endIdx,
            reason:
              'Efficacy or numeric claim lacks supporting clinical or perception study fact in library.',
            guideline: claimGuideline,
            suggestion: 'helps support healthy-looking skin',
            intent_check: 'preserved',
            intent_note: 'Reframes unsubstantiated claim into a general cosmetic benefit.',
            requires_reviewer: true,
          })
        );
      }
    }
  }

  // =========================================================================
  // 4. Accessibility Rules
  // =========================================================================

  // 4a. a11y.allcaps: 3+ consecutive all-caps words, or all-caps word >= 4 chars
  const ACRONYM_ALLOWLIST = new Set(['USA', 'SPF', 'UVA', 'UVB', 'FDA', 'HTML', 'URL', 'API', 'CTA', 'FAQ']);
  const allCapsMultiRegex = /\b[A-Z]{2,}(?:\s+[A-Z]{2,}){2,}\b/g;
  let acm: RegExpExecArray | null;
  const flaggedAllCapsIndices = new Set<number>();

  while ((acm = allCapsMultiRegex.exec(body)) !== null) {
    flaggedAllCapsIndices.add(acm.index);
    findings.push(
      createFinding({
        rule_key: 'a11y.allcaps',
        category: 'accessibility',
        severity: 'low',
        confidence: 0.95,
        excerpt: acm[0],
        start_idx: acm.index,
        end_idx: acm.index + acm[0].length,
        reason: 'Avoid 3 or more consecutive ALL CAPS words to maintain screen reader readability.',
        guideline: a11yGuideline,
        suggestion: acm[0].charAt(0).toUpperCase() + acm[0].slice(1).toLowerCase(),
        requires_reviewer: false,
      })
    );
  }

  // Also check individual shouting all-caps words >= 4 chars if not in multi-word match
  const singleAllCapsRegex = /\b[A-Z]{4,}\b/g;
  let sac: RegExpExecArray | null;
  while ((sac = singleAllCapsRegex.exec(body)) !== null) {
    if (!ACRONYM_ALLOWLIST.has(sac[0]) && !flaggedAllCapsIndices.has(sac.index)) {
      findings.push(
        createFinding({
          rule_key: 'a11y.allcaps',
          category: 'accessibility',
          severity: 'low',
          confidence: 0.9,
          excerpt: sac[0],
          start_idx: sac.index,
          end_idx: sac.index + sac[0].length,
          reason: `Avoid shouting in ALL CAPS ("${sac[0]}").`,
          guideline: a11yGuideline,
          suggestion: sac[0].charAt(0).toUpperCase() + sac[0].slice(1).toLowerCase(),
          requires_reviewer: false,
        })
      );
    }
  }

  // 4b. a11y.vague_link: "click here", "read more", "here" in markdown links or CTA
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lm: RegExpExecArray | null;
  const VAGUE_LINK_TEXTS = new Set(['click here', 'read more', 'here', 'link', 'learn more']);

  while ((lm = markdownLinkRegex.exec(body)) !== null) {
    const linkText = lm[1].trim().toLowerCase();
    if (VAGUE_LINK_TEXTS.has(linkText)) {
      findings.push(
        createFinding({
          rule_key: 'a11y.vague_link',
          category: 'accessibility',
          severity: 'low',
          confidence: 0.95,
          excerpt: lm[0],
          start_idx: lm.index,
          end_idx: lm.index + lm[0].length,
          reason: `Vague link text "${lm[1]}" hurts screen reader navigation. Use descriptive link text.`,
          guideline: a11yGuideline,
          suggestion: '[Explore our natural formulas](' + lm[2] + ')',
          requires_reviewer: false,
        })
      );
    }
  }

  // Also check standalone vague CTA phrases like "Click here" when not in markdown link
  const standaloneCtaRegex = /\b(click here|read more)\b/gi;
  let ctam: RegExpExecArray | null;
  while ((ctam = standaloneCtaRegex.exec(body)) !== null) {
    // Avoid double flagging if already part of a markdown link
    const isInsideMarkdown = findings.some(
      (f) =>
        f.rule_key === 'a11y.vague_link' &&
        typeof f.start_idx === 'number' &&
        typeof f.end_idx === 'number' &&
        ctam!.index >= f.start_idx &&
        ctam!.index <= f.end_idx
    );
    if (!isInsideMarkdown) {
      findings.push(
        createFinding({
          rule_key: 'a11y.vague_link',
          category: 'accessibility',
          severity: 'low',
          confidence: 0.9,
          excerpt: ctam[0],
          start_idx: ctam.index,
          end_idx: ctam.index + ctam[0].length,
          reason: `Vague call-to-action "${ctam[0]}" is inaccessible. Use descriptive action text.`,
          guideline: a11yGuideline,
          suggestion: 'Explore our botanical skincare collection',
          requires_reviewer: false,
        })
      );
    }
  }

  // 4c. a11y.hashtag_case: long all-lowercase hashtags (#verdantskin, #organicskincare)
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  let htm: RegExpExecArray | null;
  while ((htm = hashtagRegex.exec(body)) !== null) {
    const tagContent = htm[1];
    // Flag if hashtag is 8+ characters long and completely lowercase
    if (tagContent.length >= 8 && tagContent === tagContent.toLowerCase() && !tagContent.includes('_')) {
      findings.push(
        createFinding({
          rule_key: 'a11y.hashtag_case',
          category: 'accessibility',
          severity: 'low',
          confidence: 0.9,
          excerpt: htm[0],
          start_idx: htm.index,
          end_idx: htm.index + htm[0].length,
          reason: `Hashtag "${htm[0]}" should use PascalCase/camelCase for screen reader accessibility.`,
          guideline: a11yGuideline,
          suggestion: '#' + tagContent.charAt(0).toUpperCase() + tagContent.slice(1),
          requires_reviewer: false,
        })
      );
    }
  }

  // 4d. a11y.emoji_heavy: more than 5 emojis
  const emojiRegex =
    /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu;
  const emojis = body.match(emojiRegex);
  if (emojis && emojis.length > 5) {
    findings.push(
      createFinding({
        rule_key: 'a11y.emoji_heavy',
        category: 'accessibility',
        severity: 'low',
        confidence: 0.95,
        excerpt: emojis.slice(0, 8).join(' '),
        start_idx: null,
        end_idx: null,
        reason: `Content contains ${emojis.length} emojis (limit is 5). Emoji clutter degrades accessibility.`,
        guideline: a11yGuideline,
        suggestion: null,
        requires_reviewer: false,
      })
    );
  }

  // 4e. a11y.alt_missing: markdown image with empty alt ![]()
  const emptyAltRegex = /!\[\s*\]\(([^)]+)\)/g;
  let altm: RegExpExecArray | null;
  while ((altm = emptyAltRegex.exec(body)) !== null) {
    findings.push(
      createFinding({
        rule_key: 'a11y.alt_missing',
        category: 'accessibility',
        severity: 'medium',
        confidence: 1.0,
        excerpt: altm[0],
        start_idx: altm.index,
        end_idx: altm.index + altm[0].length,
        reason: 'Image is missing alt text. Screen readers require descriptive alt text.',
        guideline: a11yGuideline,
        suggestion: `![Verdant Skin product formulation](${altm[1]})`,
        requires_reviewer: false,
      })
    );
  }

  // 4f. a11y.readability: Flesch-Kincaid grade > 10
  const fkGrade = calculateFleschKincaidGrade(body);
  if (fkGrade > 10) {
    findings.push(
      createFinding({
        rule_key: 'a11y.readability',
        category: 'accessibility',
        severity: 'low',
        confidence: 0.85,
        excerpt: body.slice(0, Math.min(body.length, 120)) + '...',
        start_idx: 0,
        end_idx: Math.min(body.length, 120),
        reason: `Flesch-Kincaid readability grade is ${fkGrade} (target is <= 10). Simplify sentences.`,
        guideline: a11yGuideline,
        suggestion: null,
        requires_reviewer: false,
      })
    );
  }

  // =========================================================================
  // 5. Security: Injection Attempt
  // =========================================================================
  const injectionPatterns = [
    /\bignore\s+(?:all\s+)?previous\s+instructions\b/i,
    /\bdisregard\s+(?:all\s+)?prior\s+prompts\b/i,
    /\byou\s+are\s+now\s+a\b/i,
    /\bsystem\s+prompt\b/i,
  ];

  for (const pattern of injectionPatterns) {
    const injMatch = pattern.exec(body);
    if (injMatch) {
      findings.push(
        createFinding({
          rule_key: 'security.injection_attempt',
          category: 'security',
          severity: 'low',
          confidence: 0.99,
          excerpt: injMatch[0],
          start_idx: injMatch.index,
          end_idx: injMatch.index + injMatch[0].length,
          reason: 'Potential prompt injection phrase detected. Content is safely treated as data.',
          guideline: securityGuideline,
          suggestion: null,
          requires_reviewer: false,
        })
      );
    }
  }

  return findings;
}
