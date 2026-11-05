export interface RedactionMapping {
  placeholder: string;
  original: string;
  type: 'email' | 'phone' | 'api_key';
}

export interface RedactionResult {
  redactedText: string;
  count: number;
  emailCount: number;
  phoneCount: number;
  apiKeyCount: number;
  mappings: RedactionMapping[];
}

const API_KEY_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google API keys
  /\bsk-[a-zA-Z0-9_-]{20,}\b/g, // OpenAI API keys
  /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g, // GitHub tokens
  /\b(?:bearer\s+)?([a-zA-Z0-9_-]{32,})\b/g, // Long high-entropy tokens
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Matches Indian mobile (+91 or without), standard international, US formats, Indian STD landlines
const PHONE_PATTERN =
  /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|(?:\+91[\s-]?)?[6-9]\d{9}\b|\+\d{1,3}[\s-]?(?:\(\d{1,4}\)|\d{1,4})[\s-]?\d{3,4}[\s-]?\d{3,4}\b|\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{4}\b/g;

export function redact(text: string): RedactionResult {
  if (!text) {
    return {
      redactedText: text,
      count: 0,
      emailCount: 0,
      phoneCount: 0,
      apiKeyCount: 0,
      mappings: [],
    };
  }

  const mappings: RedactionMapping[] = [];
  let currentText = text;

  let apiKeyCount = 0;
  let emailCount = 0;
  let phoneCount = 0;

  // 1. Redact API keys first
  for (const pattern of API_KEY_PATTERNS) {
    currentText = currentText.replace(pattern, (match) => {
      // Avoid redacting placeholders already inserted
      if (match.startsWith('[') && match.endsWith(']')) return match;
      apiKeyCount++;
      const placeholder = `[API_KEY_${apiKeyCount}]`;
      mappings.push({
        placeholder,
        original: match,
        type: 'api_key',
      });
      return placeholder;
    });
  }

  // 2. Redact Emails
  currentText = currentText.replace(EMAIL_PATTERN, (match) => {
    if (match.startsWith('[') && match.endsWith(']')) return match;
    emailCount++;
    const placeholder = `[EMAIL_${emailCount}]`;
    mappings.push({
      placeholder,
      original: match,
      type: 'email',
    });
    return placeholder;
  });

  // 3. Redact Phones
  currentText = currentText.replace(PHONE_PATTERN, (match) => {
    if (match.startsWith('[') && match.endsWith(']')) return match;
    phoneCount++;
    const placeholder = `[PHONE_${phoneCount}]`;
    mappings.push({
      placeholder,
      original: match,
      type: 'phone',
    });
    return placeholder;
  });

  return {
    redactedText: currentText,
    count: apiKeyCount + emailCount + phoneCount,
    emailCount,
    phoneCount,
    apiKeyCount,
    mappings,
  };
}

export function unredact(text: string, mappings: RedactionMapping[]): string {
  let result = text;
  // Replace in reverse order so nested replacements are safely reversed
  for (let i = mappings.length - 1; i >= 0; i--) {
    const { placeholder, original } = mappings[i];
    result = result.replaceAll(placeholder, original);
  }
  return result;
}

