/**
 * Deterministic Intent Guard
 * Pure TypeScript module evaluating whether a compliance rewrite preserves
 * the original author's core meaning, voice, and structural intent.
 */

export interface IntentGuardContext {
  preferredTerms?: string[];
  category?: string;
}

export interface IntentGuardResult {
  verdict: 'preserved' | 'changed';
  reasons: string[];
}

const NEGATION_WORDS = new Set(['not', 'no', 'never', 'without', 'neither', 'nor']);

const INFLATION_WORDS = [
  'guarantee',
  'guaranteed',
  'guarantees',
  'cure',
  'cures',
  'clinically',
  'proven',
  'miracle',
  'miraculous',
  '100%',
];

/**
 * Extracts numeric tokens (numbers, percentages, dates, currencies)
 */
function extractNumericTokens(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?%?|\b\d+(?:st|nd|rd|th)\b|\$\d+|\d+\s*(?:percent|rupees|days|hours|weeks|months|years)\b/gi) || [];
  return matches.map((m) => m.toLowerCase().trim());
}

/**
 * Extracts entities: URLs, @mentions, and #hashtags
 */
function extractEntities(text: string): { urls: string[]; mentions: string[]; hashtags: string[] } {
  const urls = (text.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || []).map((u) => u.toLowerCase());
  const mentions = (text.match(/@[a-zA-Z0-9_]+/g) || []).map((m) => m.toLowerCase());
  const hashtags = (text.match(/#[a-zA-Z0-9_]+/g) || []).map((h) => h.toLowerCase());

  return { urls, mentions, hashtags };
}

/**
 * Extracts negation tokens from text
 */
function extractNegations(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  return words.filter((w) => NEGATION_WORDS.has(w) || w.endsWith("n't"));
}

/**
 * Evaluates whether suggestion preserves original intent deterministically.
 */
export function checkIntent(
  original: string,
  suggestion: string,
  ctx?: IntentGuardContext
): IntentGuardResult {
  const reasons: string[] = [];

  const origTrimmed = (original || '').trim();
  const suggTrimmed = (suggestion || '').trim();

  if (!origTrimmed || !suggTrimmed) {
    return { verdict: 'preserved', reasons: [] };
  }

  // 1. Length Ratio Check
  if (origTrimmed.length >= 25) {
    const ratio = suggTrimmed.length / origTrimmed.length;
    if (ratio < 0.5 || ratio > 1.6) {
      reasons.push(
        `Length ratio (${ratio.toFixed(2)}) is outside the acceptable bounds (0.50 - 1.60)`
      );
    }
  } else if (origTrimmed.length >= 10) {
    const ratio = suggTrimmed.length / origTrimmed.length;
    if (ratio < 0.3 || ratio > 3.0) {
      reasons.push(
        `Length ratio (${ratio.toFixed(2)}) is outside the acceptable bounds for short phrases`
      );
    }
  }

  // 2. Numeric Values Check
  const origNums = extractNumericTokens(origTrimmed);
  const suggNums = extractNumericTokens(suggTrimmed);
  if (origNums.length > 0) {
    // If original had numbers, suggestion must not drop them unless numbers were specifically corrected
    for (const num of origNums) {
      const numStripped = num.replace(/[^0-9]/g, '');
      const suggHasNum = suggNums.some((s) => s.includes(num) || (numStripped && s.includes(numStripped)));
      if (!suggHasNum) {
        reasons.push(`Numeric value "${num}" present in original was altered or dropped`);
      }
    }
  }

  // 3. Entities Check (URLs, @mentions, #hashtags)
  const origEntities = extractEntities(origTrimmed);
  const suggEntities = extractEntities(suggTrimmed);

  for (const url of origEntities.urls) {
    if (!suggEntities.urls.includes(url)) {
      reasons.push(`URL "${url}" removed in suggestion`);
    }
  }
  for (const mention of origEntities.mentions) {
    if (!suggEntities.mentions.includes(mention)) {
      reasons.push(`Mention "${mention}" removed in suggestion`);
    }
  }
  for (const tag of origEntities.hashtags) {
    if (!suggEntities.hashtags.includes(tag)) {
      reasons.push(`Hashtag "${tag}" removed in suggestion`);
    }
  }

  // 4. Negation Polarity Check
  const origNeg = extractNegations(origTrimmed);
  const suggNeg = extractNegations(suggTrimmed);
  if (origNeg.length === 0 && suggNeg.length > 0) {
    reasons.push(`Negation polarity altered: introduced negation word(s) (${suggNeg.join(', ')})`);
  } else if (origNeg.length > 0 && suggNeg.length === 0) {
    reasons.push(`Negation polarity altered: dropped negation word(s) (${origNeg.join(', ')})`);
  }

  // 5. Promotional Inflation Check
  const origLower = origTrimmed.toLowerCase();
  const suggLower = suggTrimmed.toLowerCase();

  for (const promoWord of INFLATION_WORDS) {
    const wordPattern = new RegExp(`\\b${promoWord.replace('%', '\\%')}\\b`, 'i');
    if (!wordPattern.test(origLower) && wordPattern.test(suggLower)) {
      reasons.push(
        `Promotional inflation: introduced ungrounded superlative or guarantee "${promoWord}"`
      );
    }
  }

  // 6. Brand Vocabulary Check
  const preferred = ctx?.preferredTerms || ['Verdant Skin'];
  for (const term of preferred) {
    const termLower = term.toLowerCase();
    if (origLower.includes(termLower) && !suggLower.includes(termLower)) {
      reasons.push(`Preferred brand term "${term}" was removed`);
    }
  }

  return {
    verdict: reasons.length === 0 ? 'preserved' : 'changed',
    reasons,
  };
}
