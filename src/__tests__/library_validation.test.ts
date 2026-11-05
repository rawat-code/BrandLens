import { describe, it, expect } from 'vitest';
import {
  guidelineCreateSchema,
  guidelineUpdateSchema,
  factCreateSchema,
  factUpdateSchema,
  termCreateSchema,
  termUpdateSchema,
} from '@/lib/validations/library';

describe('Library Validation Schemas', () => {
  describe('guidelineCreateSchema', () => {
    it('accepts valid guideline data', () => {
      const valid = {
        title: 'Brand Tone: Friendly, Never Pushy',
        category: 'tone',
        body: 'Verdant Skin speaks with warmth and professional expertise.',
        clarification: 'Keep communication informative and empowering.',
      };
      const result = guidelineCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(valid.title);
        expect(result.data.category).toBe(valid.category);
      }
    });

    it('rejects empty title or body', () => {
      const invalid = {
        title: '',
        category: 'tone',
        body: '',
      };
      const result = guidelineCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.title).toBeDefined();
        expect(errors.body).toBeDefined();
      }
    });

    it('allows optional or null clarification', () => {
      const valid = {
        title: 'Messaging Pillar: Clean',
        category: 'messaging',
        body: 'Always highlight botanical integrity.',
        clarification: null,
      };
      const result = guidelineCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('factCreateSchema', () => {
    it('accepts valid fact data', () => {
      const valid = {
        statement: 'Formulated without parabens and synthetic fragrance',
        source_note: 'Formulation Audit Report 2026-A',
        owner: 'Dr. Maya Lin, R&D',
        expires_at: '2027-11-04',
        status: 'approved' as const,
      };
      const result = factCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.statement).toBe(valid.statement);
        expect(result.data.status).toBe('approved');
      }
    });

    it('defaults status to approved if omitted', () => {
      const valid = {
        statement: 'Packaged in 100% recyclable post-consumer glass',
      };
      const result = factCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('approved');
      }
    });

    it('rejects empty statement', () => {
      const invalid = {
        statement: '   ',
      };
      const result = factCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid date strings in expires_at', () => {
      const invalid = {
        statement: 'Valid statement',
        expires_at: 'not-a-date',
      };
      const result = factCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('termCreateSchema', () => {
    it('accepts valid banned term with replacement', () => {
      const valid = {
        term: 'cure',
        kind: 'banned' as const,
        replacement: 'support healthy skin',
        note: 'Cosmetics cannot claim to cure medical conditions.',
      };
      const result = termCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.term).toBe('cure');
        expect(result.data.kind).toBe('banned');
      }
    });

    it('accepts preferred term without replacement', () => {
      const valid = {
        term: 'gentle',
        kind: 'preferred' as const,
        replacement: null,
      };
      const result = termCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid kind classification', () => {
      const invalid = {
        term: 'test',
        kind: 'unsupported-kind',
      };
      const result = termCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Update schemas partial validation', () => {
    it('allows partial updates for guidelines', () => {
      const partialUpdate = {
        title: 'Updated Title Only',
      };
      const result = guidelineUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('allows partial updates for facts', () => {
      const partialUpdate = {
        status: 'retired' as const,
      };
      const result = factUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('allows partial updates for terms', () => {
      const partialUpdate = {
        replacement: 'new-replacement',
      };
      const result = termUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });
});
