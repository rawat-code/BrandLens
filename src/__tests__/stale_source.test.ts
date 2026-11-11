import { describe, it, expect } from 'vitest';
import {
  computeSourceHash,
  checkSourceFreshness,
  aggregateCitationMetrics,
} from '@/lib/review/grounding';

describe('Stage B: Improvement 1 - Findings Backed by Sources & Freshness', () => {
  describe('computeSourceHash', () => {
    it('produces deterministic SHA-256 hex string for given text', () => {
      const text = 'At Verdant Skin, transparency is our promise.';
      const hash1 = computeSourceHash(text);
      const hash2 = computeSourceHash(text);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('ignores leading and trailing whitespace differences', () => {
      const textA = 'Dermatologist-tested formula';
      const textB = '   Dermatologist-tested formula\n\t ';
      expect(computeSourceHash(textA)).toBe(computeSourceHash(textB));
    });

    it('produces distinct hashes for different texts', () => {
      const textA = 'Features cold-pressed rosehip seed oil';
      const textB = 'Features hot-pressed rosehip seed oil';
      expect(computeSourceHash(textA)).not.toBe(computeSourceHash(textB));
    });

    it('handles empty or null inputs gracefully', () => {
      expect(computeSourceHash('')).toBe('');
      expect(computeSourceHash(null)).toBe('');
      expect(computeSourceHash(undefined)).toBe('');
    });
  });

  describe('checkSourceFreshness', () => {
    const originalText = 'All communications must reinforce our three core pillars.';
    const sourceHash = computeSourceHash(originalText);
    const sourceId = 'guideline-123';

    it('returns "unknown" if finding has no sourceId or source_hash', () => {
      expect(
        checkSourceFreshness({
          sourceId: null,
          findingSourceHash: sourceHash,
          currentSourceText: originalText,
          sourceExists: true,
        })
      ).toBe('unknown');

      expect(
        checkSourceFreshness({
          sourceId,
          findingSourceHash: null,
          currentSourceText: originalText,
          sourceExists: true,
        })
      ).toBe('unknown');
    });

    it('returns "deleted" when the library item no longer exists', () => {
      expect(
        checkSourceFreshness({
          sourceId,
          findingSourceHash: sourceHash,
          currentSourceText: null,
          sourceExists: false,
        })
      ).toBe('deleted');
    });

    it('returns "fresh" when current library text matches the review-time source hash', () => {
      expect(
        checkSourceFreshness({
          sourceId,
          findingSourceHash: sourceHash,
          currentSourceText: originalText,
          sourceExists: true,
        })
      ).toBe('fresh');
    });

    it('returns "stale" when library text was edited after the review was performed', () => {
      const modifiedText = 'All communications must reinforce our four core pillars.';
      expect(
        checkSourceFreshness({
          sourceId,
          findingSourceHash: sourceHash,
          currentSourceText: modifiedText,
          sourceExists: true,
        })
      ).toBe('stale');
    });
  });

  describe('aggregateCitationMetrics', () => {
    it('correctly aggregates verified and downgraded citations', () => {
      const findings = [
        // Verified finding
        { source_id: 'src-1', quote_verified: true, needs_human_check: false },
        // Another verified finding
        { source_id: 'src-2', quote_verified: true, needs_human_check: false },
        // Downgraded finding (had candidate citation, unverified)
        { source_id: null, quote_verified: false, needs_human_check: true },
        // Clean finding without issues
        { source_id: null, quote_verified: false, needs_human_check: false },
      ];

      const metrics = aggregateCitationMetrics(findings);
      expect(metrics.citations_total).toBe(3);
      expect(metrics.citations_verified).toBe(2);
      expect(metrics.citations_downgraded).toBe(1);
    });

    it('returns zeros for empty findings list', () => {
      const metrics = aggregateCitationMetrics([]);
      expect(metrics.citations_total).toBe(0);
      expect(metrics.citations_verified).toBe(0);
      expect(metrics.citations_downgraded).toBe(0);
    });
  });
});

