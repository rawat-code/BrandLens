import { describe, it, expect } from 'vitest';
import { redact, unredact } from '../lib/review/redact';

describe('PII Redaction (redact & unredact)', () => {
  it('handles empty or blank string', () => {
    const res = redact('');
    expect(res.redactedText).toBe('');
    expect(res.count).toBe(0);
    expect(res.mappings).toHaveLength(0);
  });

  it('redacts email addresses with [EMAIL_N]', () => {
    const input = 'Contact alice@example.com or support@verdantskin.co.uk for details.';
    const res = redact(input);
    expect(res.redactedText).toBe('Contact [EMAIL_1] or [EMAIL_2] for details.');
    expect(res.emailCount).toBe(2);
    expect(res.count).toBe(2);
    expect(res.mappings[0].original).toBe('alice@example.com');
    expect(res.mappings[1].original).toBe('support@verdantskin.co.uk');

    expect(unredact(res.redactedText, res.mappings)).toBe(input);
  });

  it('redacts Indian and international phone numbers with [PHONE_N]', () => {
    const input =
      'Call +91 9876543210 or 9876543210 or +1 (555) 123-4567 or +44 20 7946 0919.';
    const res = redact(input);
    expect(res.phoneCount).toBe(4);
    expect(res.redactedText).toContain('[PHONE_1]');
    expect(res.redactedText).toContain('[PHONE_2]');
    expect(res.redactedText).toContain('[PHONE_3]');
    expect(res.redactedText).toContain('[PHONE_4]');

    expect(unredact(res.redactedText, res.mappings)).toBe(input);
  });

  it('redacts API keys and tokens with [API_KEY_N]', () => {
    const input =
      'Keys are sk-proj-1234567890abcdefghijklmnopqrstuv and AIzaSyD1234567890abcdef1234567890abcdef.';
    const res = redact(input);
    expect(res.apiKeyCount).toBe(2);
    expect(res.redactedText).toContain('[API_KEY_1]');
    expect(res.redactedText).toContain('[API_KEY_2]');

    expect(unredact(res.redactedText, res.mappings)).toBe(input);
  });

  it('does NOT redact dates, numbers, or percentages', () => {
    const input =
      'Launched on 2026-11-05 with 100% organic ingredients, showing 85% improvement in 7 days.';
    const res = redact(input);
    expect(res.count).toBe(0);
    expect(res.redactedText).toBe(input);
  });

  it('handles mixed content with emails, phones, and API keys', () => {
    const input =
      'Reach us at support@verdant.demo or +91 9123456789 using key sk-test1234567890abcdefghijk.';
    const res = redact(input);
    expect(res.count).toBe(3);
    expect(res.emailCount).toBe(1);
    expect(res.phoneCount).toBe(1);
    expect(res.apiKeyCount).toBe(1);

    expect(unredact(res.redactedText, res.mappings)).toBe(input);
  });
});

