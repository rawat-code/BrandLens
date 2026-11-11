import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import {
  extractTextFromFile,
  DEFAULT_MAX_FILE_SIZE,
} from '@/lib/content/file-extract';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No file was provided in the upload request.' },
        { status: 400 }
      );
    }

    if (file.size > DEFAULT_MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the 5MB limit. Please upload a smaller document.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractTextFromFile(buffer, file.name, file.type);

    // Audit log document extraction
    await logAudit({
      org_id: profile.org_id,
      actor: profile.id,
      action: 'content.import_file',
      detail: {
        fileName: file.name,
        fileType: result.fileType,
        charCount: result.charCount,
        truncated: result.truncated,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    const message = err instanceof Error ? err.message : 'Failed to process document';

    if (message.includes('exceeds maximum allowed limit')) {
      return NextResponse.json({ error: message }, { status: 413 });
    }
    if (
      message.includes('Unsupported file type') ||
      message.includes('No extractable text') ||
      message.includes('empty')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
