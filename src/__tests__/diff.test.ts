import { describe, it, expect } from 'vitest';
import { computeWordDiff } from '@/lib/diff';

describe('computeWordDiff helper', () => {
  it('returns single equal token when texts are identical', () => {
    const text = 'Verdant Skin offers gentle botanicals.';
    const diff = computeWordDiff(text, text);
    expect(diff).toEqual([{ type: 'equal', value: text }]);
  });

  it('handles empty strings', () => {
    expect(computeWordDiff('', '')).toEqual([]);
  });

  it('detects insertions when old text is empty', () => {
    const text = 'Brand new content.';
    const diff = computeWordDiff('', text);
    expect(diff).toEqual([{ type: 'insert', value: text }]);
  });

  it('detects deletions when new text is empty', () => {
    const text = 'Deleted draft copy.';
    const diff = computeWordDiff(text, '');
    expect(diff).toEqual([{ type: 'delete', value: text }]);
  });

  it('detects single word replacement', () => {
    const oldText = 'Our miracle Botanical Dew Serum.';
    const newText = 'Our gentle Botanical Dew Serum.';
    const diff = computeWordDiff(oldText, newText);

    expect(diff.some((d) => d.type === 'delete' && d.value.includes('miracle'))).toBe(true);
    expect(diff.some((d) => d.type === 'insert' && d.value.includes('gentle'))).toBe(true);
    expect(diff.some((d) => d.type === 'equal' && d.value.includes('Botanical Dew Serum.'))).toBe(true);
  });

  it('handles multi-word edits preserving surrounding text', () => {
    const oldText = 'Guaranteed 100% cure for dermatitis.';
    const newText = 'Clinically tested formulation for sensitive skin.';
    const diff = computeWordDiff(oldText, newText);

    expect(diff.length).toBeGreaterThan(0);
    const deletedWords = diff.filter((d) => d.type === 'delete').map((d) => d.value).join('');
    const insertedWords = diff.filter((d) => d.type === 'insert').map((d) => d.value).join('');

    expect(deletedWords).toContain('cure');
    expect(insertedWords).toContain('formulation');
  });
});
