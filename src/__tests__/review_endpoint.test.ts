import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(msg = 'Unauthorized') {
      super(msg);
      this.name = 'UnauthorizedError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(msg = 'Forbidden') {
      super(msg);
      this.name = 'ForbiddenError';
    }
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(),
}));

vi.mock('@/lib/review/pipeline', () => ({
  runReview: vi.fn(),
}));

import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { runReview } from '@/lib/review/pipeline';
import { POST } from '@/app/api/content/[id]/review/route';

describe('POST /api/content/[id]/review endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects content when body exceeds 10,000 characters with 400 status', async () => {
    const mockProfile = {
      id: 'user-creator-1',
      org_id: 'org-verdant-1',
      role: 'creator',
      email: 'creator@verdantskin.demo',
      name: 'Creator Demo',
    };

    (requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: mockProfile,
    });

    const mockContent = {
      id: 'content-123',
      org_id: 'org-verdant-1',
      created_by: 'user-creator-1',
      current_version: 1,
    };

    const oversizedBody = 'x'.repeat(10001);

    const mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'contents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
          };
        }
        if (table === 'content_versions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { body: oversizedBody },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    (getAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAdmin);

    const req = new NextRequest('http://localhost:3000/api/content/content-123/review', {
      method: 'POST',
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'content-123' }),
    });

    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toContain('10,000 characters');
    expect(runReview).not.toHaveBeenCalled();
  });

  it('enforces org boundary check: returns 403 if content org does not match user org', async () => {
    const mockProfile = {
      id: 'user-manager-1',
      org_id: 'org-verdant-1',
      role: 'manager',
    };

    (requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: mockProfile,
    });

    const mockContent = {
      id: 'content-999',
      org_id: 'different-org-id', // mismatch
      created_by: 'someone-else',
      current_version: 1,
    };

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      }),
    };

    (getAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAdmin);

    const req = new NextRequest('http://localhost:3000/api/content/content-999/review', {
      method: 'POST',
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'content-999' }),
    });

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.error).toContain('Forbidden');
    expect(runReview).not.toHaveBeenCalled();
  });

  it('prevents creator from reviewing another creator’s draft', async () => {
    const mockProfile = {
      id: 'user-creator-1',
      org_id: 'org-verdant-1',
      role: 'creator',
    };

    (requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: mockProfile,
    });

    const mockContent = {
      id: 'content-different-creator',
      org_id: 'org-verdant-1',
      created_by: 'user-creator-2', // Different creator!
      current_version: 1,
    };

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      }),
    };

    (getAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAdmin);

    const req = new NextRequest('http://localhost:3000/api/content/content-different-creator/review', {
      method: 'POST',
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'content-different-creator' }),
    });

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.error).toContain('Creators can only run review on their own content');
    expect(runReview).not.toHaveBeenCalled();
  });

  it('enforces rate limiting (max 10 requests/min per user) with 429 status', async () => {
    const rateLimitUserId = 'user-rate-limited-' + Date.now();
    const mockProfile = {
      id: rateLimitUserId,
      org_id: 'org-verdant-1',
      role: 'creator',
    };

    (requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: mockProfile,
    });

    const mockContent = {
      id: 'content-rate-test',
      org_id: 'org-verdant-1',
      created_by: rateLimitUserId,
      current_version: 1,
    };

    const mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'contents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
          };
        }
        if (table === 'content_versions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { body: 'Valid body for rate test.' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    (getAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAdmin);
    (runReview as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ai_reviewed',
      findings: [],
    });

    // Fire 10 allowed requests
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost:3000/api/content/content-rate-test/review', {
        method: 'POST',
      });
      const res = await POST(req, { params: Promise.resolve({ id: 'content-rate-test' }) });
      expect(res.status).toBe(200);
    }

    // 11th request must be rate-limited with 429
    const req11 = new NextRequest('http://localhost:3000/api/content/content-rate-test/review', {
      method: 'POST',
    });
    const res11 = await POST(req11, { params: Promise.resolve({ id: 'content-rate-test' }) });
    expect(res11.status).toBe(429);
    const json11 = await res11.json();
    expect(json11.error).toContain('Rate limit exceeded');
  });
});

