import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as transitionPost } from '@/app/api/content/[id]/transition/route';
import { POST as acceptPost } from '@/app/api/findings/[id]/accept/route';
import { POST as disputePost } from '@/app/api/findings/[id]/dispute/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

describe('Concurrency & Optimistic Locking (409 Conflict)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transition Route Concurrency', () => {
    it('returns 409 Conflict when expected_from differs from current content status', async () => {
      const { requireRole } = await import('@/lib/auth');
      const { getAdminClient } = await import('@/lib/supabase/admin');

      vi.mocked(requireRole).mockResolvedValueOnce({
        profile: { id: 'mgr-1', org_id: 'org-1', role: 'manager', email: 'm@verdant.demo', full_name: 'Manager' },
      } as any);

      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'cnt-1',
                    org_id: 'org-1',
                    created_by: 'creator-1',
                    status: 'approved', // Already approved concurrently!
                    current_version: 1,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      vi.mocked(getAdminClient).mockReturnValue(mockAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/content/cnt-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          to: 'approved',
          expected_from: 'in_review', // Client thought it was still in_review
        }),
      });

      const res = await transitionPost(req, { params: Promise.resolve({ id: 'cnt-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('Workflow conflict');
      expect(json.current_status).toBe('approved');
    });

    it('returns 409 Conflict when optimistic lock update returns null (concurrent write)', async () => {
      const { requireRole } = await import('@/lib/auth');
      const { getAdminClient } = await import('@/lib/supabase/admin');

      vi.mocked(requireRole).mockResolvedValueOnce({
        profile: { id: 'mgr-1', org_id: 'org-1', role: 'manager', email: 'm@verdant.demo', full_name: 'Manager' },
      } as any);

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'contents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 'cnt-1',
                        org_id: 'org-1',
                        created_by: 'creator-1',
                        status: 'in_review',
                        current_version: 1,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null, // Update matched 0 rows because another worker changed status
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'findings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: [] }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(getAdminClient).mockReturnValue(mockAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/content/cnt-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          to: 'approved',
        }),
      });

      const res = await transitionPost(req, { params: Promise.resolve({ id: 'cnt-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('Workflow conflict');
    });
  });

  describe('Finding Accept & Dispute Concurrency', () => {
    it('returns 409 Conflict when accepting a finding that is already accepted', async () => {
      const { requireRole } = await import('@/lib/auth');
      const { getAdminClient } = await import('@/lib/supabase/admin');

      vi.mocked(requireRole).mockResolvedValueOnce({
        profile: { id: 'usr-1', org_id: 'org-1', role: 'creator', email: 'c@verdant.demo', full_name: 'Creator' },
      } as any);

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'findings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'fnd-1',
                      content_id: 'cnt-1',
                      status: 'accepted', // Already accepted!
                      suggestion: 'gentle',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'contents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'cnt-1', org_id: 'org-1', created_by: 'usr-1' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(getAdminClient).mockReturnValue(mockAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/findings/fnd-1/accept', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await acceptPost(req, { params: Promise.resolve({ id: 'fnd-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('Conflict');
      expect(json.error).toContain('accepted');
    });

    it('returns 409 Conflict when disputing a finding that is already disputed', async () => {
      const { requireRole } = await import('@/lib/auth');
      const { getAdminClient } = await import('@/lib/supabase/admin');

      vi.mocked(requireRole).mockResolvedValueOnce({
        profile: { id: 'usr-1', org_id: 'org-1', role: 'creator', email: 'c@verdant.demo', full_name: 'Creator' },
      } as any);

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'findings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'fnd-1',
                      content_id: 'cnt-1',
                      status: 'disputed', // Already disputed!
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'contents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'cnt-1', org_id: 'org-1', created_by: 'usr-1' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(getAdminClient).mockReturnValue(mockAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/findings/fnd-1/dispute', {
        method: 'POST',
        body: JSON.stringify({ dispute_reason: 'Legitimate medical citation' }),
      });

      const res = await disputePost(req, { params: Promise.resolve({ id: 'fnd-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('Conflict');
      expect(json.error).toContain('disputed');
    });
  });
});
