import { NextRequest, NextResponse } from 'next/server';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { runReview } from '@/lib/review/pipeline';
import type { Content, ContentVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Simple in-memory rate limiter per user (max 10 reviews/min/user)
const userReviewTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = userReviewTimestamps.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  validTimestamps.push(now);
  userReviewTimestamps.set(userId, validTimestamps);
  return true;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { profile } = await requireRole(['creator', 'manager', 'reviewer', 'admin']);

    // 1. In-memory rate limiting check
    if (!checkRateLimit(profile.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 reviews per minute per user.' },
        { status: 429 }
      );
    }

    const admin = getAdminClient();

    // 2. Fetch content record to check org and creator permissions
    const { data: contentData, error: contentError } = await admin
      .from('contents')
      .select('*')
      .eq('id', id)
      .single();

    if (contentError || !contentData) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    const content = contentData as Content;

    // 3. Org boundary check
    if (content.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'Forbidden: content belongs to a different organization' },
        { status: 403 }
      );
    }

    // 4. Role check: Creator can only review own content
    if (profile.role === 'creator' && content.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden: Creators can only run review on their own content' },
        { status: 403 }
      );
    }

    // 5. Check body size limit (max 10,000 characters)
    const { data: versionData } = await admin
      .from('content_versions')
      .select('body')
      .eq('content_id', id)
      .eq('version', content.current_version)
      .single();

    if (versionData) {
      const bodyText = (versionData as Pick<ContentVersion, 'body'>).body;
      if (bodyText && bodyText.length > 10000) {
        return NextResponse.json(
          { error: 'Content exceeds the maximum permitted limit of 10,000 characters' },
          { status: 400 }
        );
      }
    }

    // 6. Execute full review pipeline
    const result = await runReview(id, profile.id);

    return NextResponse.json({
      success: true,
      findings: result.findings,
      content: result.content,
      version: result.version,
      aiUnavailable: result.aiUnavailable,
      aiRun: result.aiRun,
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
