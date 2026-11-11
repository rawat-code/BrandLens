import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectFileType,
  extractTextFromFile,
} from '@/lib/content/file-extract';
import { POST } from '@/app/api/content/import-file/route';
import { NextRequest } from 'next/server';

// Minimal valid single-page PDF containing "BrandLens Document Test Text"
const MINIMAL_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+IGVuZG9iagoy' +
  'IDAgb2JqIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmoKMyAw' +
  'IG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA8PC9Gb250IDw8L0Yx' +
  'IDQgMCBSPj4+PiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNSAwIFI+PiBlbmRv' +
  'YmoKNCAwIG9iaiA8PC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZl' +
  'dGljYT4+IGVuZG9iago1IDAgb2JqIDw8L0xlbmd0aCA1Mj4+IHN0cmVhbQpCVAovRjEgMTIgVGYK' +
  'NzIgNzEyIFRkCihCcmFuZExlbnMgRG9jdW1lbnQgVGVzdCBUZXh0KSBUagpFVAplbmRzdHJlYW0K' +
  'ZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAow' +
  'MDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIyNyAwMDAwMCBu' +
  'IAowMDAwMDAwMjk1IDAwMDAwIG4gCnRyYWlsZXIgPDwvU2l6ZSA2IC9Sb290IDEgMCBSPj4Kc3Rh' +
  'cnR4cmVmCjM5NwolaUVPRg==';

const validPdfBuffer = Buffer.from(MINIMAL_PDF_BASE64, 'base64');

// Mock dependencies for route handler
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

describe('File Extraction Pure Functions', () => {
  it('detects .docx and .pdf file types correctly by extension and mime', () => {
    expect(detectFileType('launch-copy.docx')).toBe('docx');
    expect(detectFileType('PRESS-RELEASE.DOCX')).toBe('docx');
    expect(
      detectFileType('unknown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('docx');

    expect(detectFileType('guidelines.pdf')).toBe('pdf');
    expect(detectFileType('ANNUAL_REPORT.PDF')).toBe('pdf');
    expect(detectFileType('unknown', 'application/pdf')).toBe('pdf');

    expect(detectFileType('image.png', 'image/png')).toBeNull();
    expect(detectFileType('script.js', 'application/javascript')).toBeNull();
  });

  it('rejects empty buffers', async () => {
    await expect(
      extractTextFromFile(Buffer.alloc(0), 'empty.pdf', 'application/pdf')
    ).rejects.toThrow('The uploaded file is empty.');
  });

  it('rejects files exceeding the size limit', async () => {
    const hugeBuffer = Buffer.alloc(100);
    await expect(
      extractTextFromFile(hugeBuffer, 'test.pdf', 'application/pdf', {
        maxSizeInBytes: 50,
      })
    ).rejects.toThrow('exceeds maximum allowed limit');
  });

  it('rejects unsupported file formats', async () => {
    const buffer = Buffer.from('hello world');
    await expect(
      extractTextFromFile(buffer, 'document.txt', 'text/plain')
    ).rejects.toThrow('Unsupported file type');
  });

  it('extracts text from a valid PDF document', async () => {
    const result = await extractTextFromFile(validPdfBuffer, 'test-doc.pdf', 'application/pdf');
    expect(result.fileType).toBe('pdf');
    expect(result.text).toContain('BrandLens Document Test Text');
    expect(result.truncated).toBe(false);
    expect(result.charCount).toBeGreaterThan(0);
  });

  it('truncates extracted text when exceeding maxChars', async () => {
    const result = await extractTextFromFile(validPdfBuffer, 'test-doc.pdf', 'application/pdf', {
      maxChars: 10,
    });
    expect(result.truncated).toBe(true);
    expect(result.charCount).toBe(10);
    expect(result.text.length).toBe(10);
    expect(result.warning).toBeDefined();
    expect(result.originalLength).toBeGreaterThan(10);
  });
});

describe('POST /api/content/import-file Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { requireRole, UnauthorizedError } = await import('@/lib/auth');
    vi.mocked(requireRole).mockRejectedValueOnce(new UnauthorizedError('Sign in required'));

    const formData = new FormData();
    formData.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'test.pdf');

    const req = new NextRequest('http://localhost:3000/api/content/import-file', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Sign in required');
  });

  it('rejects requests without a file', async () => {
    const { requireRole } = await import('@/lib/auth');
    vi.mocked(requireRole).mockResolvedValueOnce({
      profile: { id: 'usr-1', org_id: 'org-1', role: 'creator', email: 'c@test.com', full_name: 'Creator' },
    } as unknown as Awaited<ReturnType<typeof requireRole>>);

    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/content/import-file', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No file was provided');
  });

  it('extracts text from valid PDF and records audit log', async () => {
    const { requireRole } = await import('@/lib/auth');
    const { logAudit } = await import('@/lib/audit');

    vi.mocked(requireRole).mockResolvedValueOnce({
      profile: { id: 'usr-1', org_id: 'org-1', role: 'creator', email: 'c@test.com', full_name: 'Creator' },
    } as unknown as Awaited<ReturnType<typeof requireRole>>);

    const formData = new FormData();
    formData.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'test.pdf');

    const req = new NextRequest('http://localhost:3000/api/content/import-file', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.text).toContain('BrandLens Document Test Text');
    expect(json.fileType).toBe('pdf');
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        actor: 'usr-1',
        action: 'content.import_file',
      })
    );
  });

  it('rejects unsupported file type with 400', async () => {
    const { requireRole } = await import('@/lib/auth');
    vi.mocked(requireRole).mockResolvedValueOnce({
      profile: { id: 'usr-1', org_id: 'org-1', role: 'creator', email: 'c@test.com', full_name: 'Creator' },
    } as unknown as Awaited<ReturnType<typeof requireRole>>);

    const formData = new FormData();
    formData.append('file', new Blob(['console.log(1)'], { type: 'text/javascript' }), 'script.js');

    const req = new NextRequest('http://localhost:3000/api/content/import-file', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Unsupported file type');
  });
});
