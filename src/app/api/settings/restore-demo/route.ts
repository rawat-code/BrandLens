import { NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { restoreDemoContent } from '@/lib/demo-seed';

export async function POST() {
  try {
    const { profile } = await requireRole(['admin']);

    const result = await restoreDemoContent(profile.org_id, profile.id);

    return NextResponse.json({
      success: true,
      message: 'Demo content and guidelines restored successfully.',
      result,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('Error in restore-demo:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

