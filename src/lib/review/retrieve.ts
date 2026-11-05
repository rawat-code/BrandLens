import type { Guideline, Fact, Term } from '@/lib/types';
import { tokenizeWithoutStopwords, calculateLexicalOverlap } from './rules';

export interface RetrievedChunk {
  id: string;
  guidelineId: string;
  title: string;
  text: string;
  score: number;
  category?: string;
}

export interface Retriever {
  retrieve(
    sentences: string[],
    guidelines: Guideline[],
    facts?: Fact[],
    terms?: Term[]
  ): Promise<RetrievedChunk[]> | RetrievedChunk[];
}

export function chunkGuideline(guideline: Guideline): { id: string; guidelineId: string; title: string; text: string; category?: string }[] {
  const paragraphs = guideline.body
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length <= 1) {
    return [
      {
        id: guideline.id,
        guidelineId: guideline.id,
        title: guideline.title,
        text: guideline.body.trim(),
        category: guideline.category,
      },
    ];
  }

  return paragraphs.map((p, idx) => ({
    id: `${guideline.id}#p${idx + 1}`,
    guidelineId: guideline.id,
    title: guideline.title,
    text: p,
    category: guideline.category,
  }));
}

export class LexicalRetriever implements Retriever {
  retrieve(
    sentences: string[],
    guidelines: Guideline[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _facts?: Fact[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _terms?: Term[]
  ): RetrievedChunk[] {
    if (!guidelines.length || !sentences.length) {
      return [];
    }

    // 1. Build all chunks across guidelines
    const allChunks = guidelines.flatMap(chunkGuideline);
    if (!allChunks.length) return [];

    // Pre-tokenize all chunks
    const chunkTokensMap = new Map<string, string[]>();
    for (const chunk of allChunks) {
      // Include title and chunk text in tokenization for rich matching
      chunkTokensMap.set(
        chunk.id,
        tokenizeWithoutStopwords(`${chunk.title} ${chunk.text}`)
      );
    }

    // 2. Score chunks per sentence and keep top 4 per sentence
    const bestChunkScores = new Map<string, RetrievedChunk>();

    for (const sentence of sentences) {
      const sTokens = tokenizeWithoutStopwords(sentence);
      if (!sTokens.length) continue;

      const scored = allChunks
        .map((chunk) => {
          const cTokens = chunkTokensMap.get(chunk.id) || [];
          const score = calculateLexicalOverlap(sTokens, cTokens);
          return {
            ...chunk,
            score,
          };
        })
        .sort((a, b) => b.score - a.score);

      // Top 4 per sentence
      const top4 = scored.slice(0, 4);

      for (const item of top4) {
        const existing = bestChunkScores.get(item.id);
        if (!existing || item.score > existing.score) {
          bestChunkScores.set(item.id, item);
        }
      }
    }

    // Return deduplicated chunks sorted by score descending
    return Array.from(bestChunkScores.values()).sort((a, b) => b.score - a.score);
  }
}

export const defaultRetriever = new LexicalRetriever();

export function retrieve(
  sentences: string[],
  guidelines: Guideline[],
  facts?: Fact[],
  terms?: Term[]
): RetrievedChunk[] {
  return defaultRetriever.retrieve(sentences, guidelines, facts, terms);
}

