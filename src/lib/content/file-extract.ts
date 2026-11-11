/**
 * Pure file extraction module for BrandLens.
 *
 * Supported formats:
 * - DOCX (.docx) via mammoth (extractRawText)
 * - PDF (.pdf) via pdf-parse
 *
 * Guarantees:
 * 1. Zero document storage: buffers are held in memory during extraction only and never persisted to disk or DB.
 * 2. 5 MB upload limit enforcement.
 * 3. 10,000 character maximum limit enforcement with clear truncation metadata.
 * 4. Normalization of extracted text (excessive whitespace trimmed).
 */

export interface FileExtractOptions {
  maxSizeInBytes?: number; // default 5 MB
  maxChars?: number; // default 10,000
}

export interface FileExtractResult {
  text: string;
  originalLength: number;
  charCount: number;
  truncated: boolean;
  warning?: string;
  fileName: string;
  fileType: 'docx' | 'pdf';
}

export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_MAX_CHARS = 10000;

export function detectFileType(fileName: string, mimeType?: string): 'docx' | 'pdf' | null {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() || '';

  if (
    lowerName.endsWith('.docx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (lowerName.endsWith('.pdf') || lowerMime === 'application/pdf') {
    return 'pdf';
  }

  return null;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

interface PDFParseInstance {
  getText: (options?: { pageJoiner?: string }) => Promise<{ text?: string }>;
  destroy?: () => Promise<void> | void;
}

interface PDFModuleShape {
  PDFParse?: new (options: { data: Buffer | Uint8Array }) => PDFParseInstance;
  default?: (buffer: Buffer) => Promise<{ text?: string }>;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfModule = (await import('pdf-parse')) as unknown as PDFModuleShape;

  if (pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: buffer });
    try {
      const res = await parser.getText({ pageJoiner: '' });
      return res.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }

  if (typeof pdfModule.default === 'function') {
    const res = await pdfModule.default(buffer);
    return res.text || '';
  }

  if (typeof pdfModule === 'function') {
    const fn = pdfModule as unknown as (b: Buffer) => Promise<{ text?: string }>;
    const res = await fn(buffer);
    return res.text || '';
  }

  throw new Error('PDF parsing library could not be initialized.');
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
  options?: FileExtractOptions
): Promise<FileExtractResult> {
  const maxBytes = options?.maxSizeInBytes ?? DEFAULT_MAX_FILE_SIZE;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  if (buffer.length > maxBytes) {
    throw new Error(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  const fileType = detectFileType(fileName, mimeType);
  if (!fileType) {
    throw new Error(
      'Unsupported file type. Only Word documents (.docx) and PDF files (.pdf) are supported.'
    );
  }

  let rawText = '';
  try {
    if (fileType === 'docx') {
      rawText = await extractTextFromDocx(buffer);
    } else {
      rawText = await extractTextFromPdf(buffer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown extraction failure';
    throw new Error(`Failed to extract text from ${fileType.toUpperCase()} file: ${msg}`);
  }

  // Normalize excessive whitespace and blank lines (replace 3+ newlines with 2)
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalizedText) {
    throw new Error(
      'No extractable text was found in the uploaded file. Please verify that the document contains selectable text and is not an image scan.'
    );
  }

  const originalLength = normalizedText.length;
  let text = normalizedText;
  let truncated = false;
  let warning: string | undefined;

  if (originalLength > maxChars) {
    text = normalizedText.slice(0, maxChars);
    truncated = true;
    warning = `Content was truncated from ${originalLength.toLocaleString()} to ${maxChars.toLocaleString()} characters to fit brand review limits.`;
  }

  return {
    text,
    originalLength,
    charCount: text.length,
    truncated,
    warning,
    fileName,
    fileType,
  };
}
