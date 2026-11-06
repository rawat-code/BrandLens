export type GuidelineCategory =
  | 'tone'
  | 'messaging'
  | 'claim'
  | 'accessibility'
  | 'general';

export interface ParsedGuideline {
  title: string;
  category: GuidelineCategory;
  body: string;
  clarification?: string;
}

/**
 * Automatically infers a guideline category based on title and body keywords.
 */
export function inferGuidelineCategory(
  title: string,
  body: string,
  fallback: GuidelineCategory = 'general'
): GuidelineCategory {
  const combined = `${title} ${body}`.toLowerCase();

  if (
    combined.includes('accessibility') ||
    combined.includes('a11y') ||
    combined.includes('alt text') ||
    combined.includes('screen reader') ||
    combined.includes('hashtag') ||
    combined.includes('readability') ||
    combined.includes('all caps')
  ) {
    return 'accessibility';
  }

  if (
    combined.includes('claim') ||
    combined.includes('guarantee') ||
    combined.includes('cure') ||
    combined.includes('medical') ||
    combined.includes('efficacy') ||
    combined.includes('clinical') ||
    combined.includes('proven') ||
    combined.includes('100%') ||
    combined.includes('miracle')
  ) {
    return 'claim';
  }

  if (
    combined.includes('tone') ||
    combined.includes('voice') ||
    combined.includes('urgency') ||
    combined.includes('pushy') ||
    combined.includes('warmth') ||
    combined.includes('empathy') ||
    combined.includes('shaming')
  ) {
    return 'tone';
  }

  if (
    combined.includes('pillar') ||
    combined.includes('messaging') ||
    combined.includes('mission') ||
    combined.includes('positioning') ||
    combined.includes('audience') ||
    combined.includes('story')
  ) {
    return 'messaging';
  }

  return fallback;
}

/**
 * Parses raw text or markdown into individual guidelines by headings or sections.
 */
export function parseGuidelinesMarkdown(
  rawText: string,
  defaultCategory: GuidelineCategory = 'general'
): ParsedGuideline[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/);
  const sections: { rawTitle: string; bodyLines: string[] }[] = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/;
  let currentTitle = '';
  let currentBodyLines: string[] = [];
  let foundHeading = false;

  for (const line of lines) {
    const headingMatch = line.match(headingRegex);

    if (headingMatch) {
      foundHeading = true;
      if (currentTitle || currentBodyLines.some((l) => l.trim().length > 0)) {
        sections.push({
          rawTitle: currentTitle || 'General Guideline',
          bodyLines: currentBodyLines,
        });
      }
      currentTitle = headingMatch[2].trim();
      currentBodyLines = [];
    } else {
      currentBodyLines.push(line);
    }
  }

  if (currentTitle || currentBodyLines.some((l) => l.trim().length > 0)) {
    sections.push({
      rawTitle: currentTitle || 'General Guideline',
      bodyLines: currentBodyLines,
    });
  }

  // If no markdown headings were detected, fallback to double-newline paragraphs
  if (!foundHeading) {
    const paragraphs = trimmed
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    return paragraphs.map((para, idx) => {
      const paraLines = para.split(/\r?\n/);
      const firstLine = paraLines[0].replace(/^(\d+[\.\)]|[-*•])\s*/, '').trim();
      const rest = paraLines.slice(1).join('\n').trim();

      const title =
        firstLine.length <= 80 && rest.length > 0
          ? firstLine
          : `Guideline ${idx + 1}`;
      const body = rest.length > 0 ? rest : para;
      const category = inferGuidelineCategory(title, body, defaultCategory);

      return {
        title,
        category,
        body,
      };
    });
  }

  // Format parsed sections
  return sections
    .map((sec, idx) => {
      const title = sec.rawTitle.replace(/[*_`]/g, '').trim() || `Guideline ${idx + 1}`;
      let body = sec.bodyLines.join('\n').trim();
      let clarification: string | undefined;

      // Extract clarification/note if present
      const noteMatch = body.match(
        /(?:^|\n)(?:Clarification|Note|Rationale|Guidance):\s*([^\n]+(?:\n[^\n]+)*)/i
      );
      if (noteMatch) {
        clarification = noteMatch[1].trim();
        body = body.replace(noteMatch[0], '').trim();
      }

      if (!body) {
        body = title;
      }

      const category = inferGuidelineCategory(title, body, defaultCategory);

      return {
        title,
        category,
        body,
        clarification,
      };
    })
    .filter((g) => g.body.length > 0);
}
