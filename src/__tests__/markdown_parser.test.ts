import { describe, it, expect } from 'vitest';
import {
  parseGuidelinesMarkdown,
  inferGuidelineCategory,
} from '@/lib/library/markdown-parser';

describe('Markdown Guideline Parser', () => {
  it('returns empty array on empty input', () => {
    expect(parseGuidelinesMarkdown('')).toEqual([]);
    expect(parseGuidelinesMarkdown('   \n\n  ')).toEqual([]);
  });

  it('splits markdown text into distinct guidelines by markdown headings', () => {
    const markdown = `
# Brand Voice: Warmth & Professional Empathy
We speak with kindness and professional authority. Never push urgency tactics like "BUY NOW".
Clarification: Maintain conversational tone without sounding transactional.

## Digital Accessibility & Screen Readers
Include descriptive alt text for all product images. Avoid all-caps headlines.

### Efficacy Claims Guardrail
Never promise 100% cure or immediate reversal of chronic skin conditions.
`;

    const parsed = parseGuidelinesMarkdown(markdown);
    expect(parsed.length).toBe(3);

    expect(parsed[0].title).toBe('Brand Voice: Warmth & Professional Empathy');
    expect(parsed[0].category).toBe('tone');
    expect(parsed[0].body).toContain('We speak with kindness');
    expect(parsed[0].clarification).toBe('Maintain conversational tone without sounding transactional.');

    expect(parsed[1].title).toBe('Digital Accessibility & Screen Readers');
    expect(parsed[1].category).toBe('accessibility');
    expect(parsed[1].body).toContain('Include descriptive alt text');

    expect(parsed[2].title).toBe('Efficacy Claims Guardrail');
    expect(parsed[2].category).toBe('claim');
    expect(parsed[2].body).toContain('Never promise 100% cure');
  });

  it('falls back to double newlines and infers categories if no markdown headings are used', () => {
    const text = `
Messaging Pillars
All communications must reinforce botanical integrity and sustainable packaging.

Claims Policy
Never guarantee miracle results or promise medical disease treatment.
`;

    const parsed = parseGuidelinesMarkdown(text);
    expect(parsed.length).toBe(2);
    expect(parsed[0].title).toBe('Messaging Pillars');
    expect(parsed[0].category).toBe('messaging');
    expect(parsed[1].title).toBe('Claims Policy');
    expect(parsed[1].category).toBe('claim');
  });

  it('correctly infers category from keywords', () => {
    expect(inferGuidelineCategory('Urgency and Pushy Sales Language', '')).toBe('tone');
    expect(inferGuidelineCategory('Core Mission and Pillars', '')).toBe('messaging');
    expect(inferGuidelineCategory('Medical Claims and Cures', '')).toBe('claim');
    expect(inferGuidelineCategory('Screen Reader Hashtags and Alt Text', '')).toBe('accessibility');
    expect(inferGuidelineCategory('General Standard', 'Standard operations')).toBe('general');
  });
});
