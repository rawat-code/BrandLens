import { describe, it, expect } from 'vitest';
import { contentCreateSchema } from '@/lib/validations/content';

describe('Content Validation Schemas', () => {
  it('accepts valid content creation data', () => {
    const valid = {
      title: 'Spring Botanical Dew Serum Launch Copy',
      channel: 'instagram',
      audience: 'Sensitive skin skincare enthusiasts',
      confidential: false,
      body: 'Introducing our soothing Botanical Dew Serum, crafted with ethically sourced plant extracts.',
      note: 'Initial campaign caption draft',
    };

    const result = contentCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe(valid.title);
      expect(result.data.channel).toBe('instagram');
      expect(result.data.confidential).toBe(false);
    }
  });

  it('rejects empty title or body', () => {
    const invalid = {
      title: '   ',
      channel: 'instagram',
      body: '',
    };

    const result = contentCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
      expect(fieldErrors.body).toBeDefined();
    }
  });

  it('rejects content body exceeding 10,000 characters', () => {
    const tooLongBody = 'a'.repeat(10001);
    const invalid = {
      title: 'Valid Title',
      channel: 'blog',
      body: tooLongBody,
    };

    const result = contentCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.body?.[0]).toContain('10,000 characters');
    }
  });

  it('accepts content body exactly at 10,000 characters', () => {
    const exactly10k = 'a'.repeat(10000);
    const valid = {
      title: 'Max Limit Test',
      channel: 'website',
      body: exactly10k,
    };

    const result = contentCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('handles optional audience, confidential defaults to false, and optional note', () => {
    const valid = {
      title: 'Minimal Content Draft',
      channel: 'email',
      body: 'Newsletter copy without extra fields.',
    };

    const result = contentCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidential).toBe(false);
      expect(result.data.audience).toBeUndefined();
      expect(result.data.note).toBeUndefined();
    }
  });

  it('properly preserves confidential = true flag', () => {
    const confidentialDraft = {
      title: 'Unreleased Patent Formula Description',
      channel: 'packaging',
      confidential: true,
      body: 'Contains proprietary Botanical Complex 44B.',
    };

    const result = contentCreateSchema.safeParse(confidentialDraft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidential).toBe(true);
    }
  });
});
