import { describe, it, expect } from 'vitest';
import { checkIntent } from '@/lib/review/intent-guard';

describe('Stage C: Improvement 2 - Intent Guard Verification', () => {
  describe('Positive Preservation', () => {
    it('approves compliant rewrites that preserve core message, entities, and numbers', () => {
      const original = 'Our gentle botanical serum reduces redness in 14 days.';
      const suggestion = 'Our botanical soothing serum visibly calms redness in 14 days.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('preserved');
      expect(result.reasons).toHaveLength(0);
    });

    it('handles empty strings gracefully', () => {
      const result = checkIntent('', '');
      expect(result.verdict).toBe('preserved');
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('Numeric Values Guard', () => {
    it('flags when numbers or percentages from the original are dropped or altered', () => {
      const original = 'Formulated with 5% niacinamide and 2% zinc for barrier support.';
      const suggestion = 'Formulated with clean niacinamide for barrier support.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Numeric value'))).toBe(true);
    });

    it('passes when numbers from original are retained in suggestion', () => {
      const original = 'Provides 24 hours of hydration without pore-clogging oils.';
      const suggestion = 'Delivers 24 hours of gentle hydration without pore-clogging oils.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('preserved');
    });
  });

  describe('Entities Guard (URLs, @mentions, #hashtags)', () => {
    it('flags when a URL is removed in the suggestion', () => {
      const original = 'Check out our clinical study at https://verdantskin.com/trial for details.';
      const suggestion = 'Check out our clinical study for details.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('URL'))).toBe(true);
    });

    it('flags when a mention or hashtag is dropped', () => {
      const original = 'Follow @verdantskin and share your story with #PlantGlow today!';
      const suggestion = 'Follow our brand and share your story today!';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Mention') || r.includes('Hashtag'))).toBe(true);
    });
  });

  describe('Negation Polarity Guard', () => {
    it('flags when a negation word is added where none existed', () => {
      const original = 'Contains naturally derived essential oils.';
      const suggestion = 'Contains no naturally derived essential oils.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Negation polarity altered'))).toBe(true);
    });

    it('flags when a negation word is removed, flipping the claim', () => {
      const original = 'Our formula does not contain parabens or phthalates.';
      const suggestion = 'Our formula contains parabens or phthalates.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Negation polarity altered'))).toBe(true);
    });
  });

  describe('Promotional Inflation Guard', () => {
    it('flags when ungrounded superlative or guarantee words are injected', () => {
      const original = 'Our soothing lotion hydrates dry skin.';
      const suggestion = 'Our miracle lotion cures dry skin with guaranteed results.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Promotional inflation'))).toBe(true);
    });
  });

  describe('Length Ratio Guard', () => {
    it('flags suggestions that severely truncate the original content', () => {
      const original = 'Formulated with organic aloe vera, calendula, chamomile, and vitamin E for sensitive skin barrier repair.';
      const suggestion = 'Aloe lotion.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Length ratio'))).toBe(true);
    });

    it('flags suggestions that excessively bloat the text beyond 1.6x length', () => {
      const original = 'Hydrating facial mist.';
      const suggestion = 'A wonderfully luxurious, supremely rejuvenating and exquisitely crafted botanical facial mist that moisturizes, invigorates, replenishes and revitalizes tired skin morning, noon, and night.';

      const result = checkIntent(original, suggestion);
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Length ratio'))).toBe(true);
    });
  });

  describe('Brand Vocabulary Guard', () => {
    it('flags when a preferred brand term is dropped from the rewrite', () => {
      const original = 'Welcome to Verdant Skin daily hydration routines.';
      const suggestion = 'Welcome to our daily hydration routines.';

      const result = checkIntent(original, suggestion, { preferredTerms: ['Verdant Skin'] });
      expect(result.verdict).toBe('changed');
      expect(result.reasons.some((r) => r.includes('Preferred brand term'))).toBe(true);
    });
  });
});
