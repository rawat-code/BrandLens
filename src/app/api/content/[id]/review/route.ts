import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { runReview } from '@/lib/review/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

    const result = await runReview(id, profile.id);

    return NextResponse.json({
      success: true,
      findings: result.findings,
      content: result.content,
      version: result.version,
      aiUnavailable: result.aiUnavailable,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Review execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
