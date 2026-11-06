/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/settings/org/route';
import { POST } from '@/app/api/settings/start-fresh/route';
import { requireRole, ForbiddenError } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {
    status = 401;
  },
  ForbiddenError: class ForbiddenError extends Error {
    status = 403;
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

describe('Settings API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/settings/org', () => {
    it('returns 403 if user is not an admin', async () => {
      vi.mocked(requireRole).mockRejectedValueOnce(new ForbiddenError('Forbidden'));

      const req = new Request('http://localhost/api/settings/org', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Brand Name' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 if name is empty', async () => {
      vi.mocked(requireRole).mockResolvedValueOnce({
        user: { id: 'admin-1' } as any,
        profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
      });

      const req = new Request('http://localhost/api/settings/org', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid input');
    });

    it('updates organisation name and logs audit entry', async () => {
      vi.mocked(requireRole).mockResolvedValueOnce({
        user: { id: 'admin-1' } as any,
        profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
      });

      let isUpdating = false;
      const mockFrom = vi.fn((table: string) => {
        if (table === 'orgs') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn(() => {
              isUpdating = true;
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: 'org-1', name: 'New Brand' },
                  error: null,
                }),
              };
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => {
              return {
                data: isUpdating
                  ? { id: 'org-1', name: 'New Brand' }
                  : { id: 'org-1', name: 'Old Org' },
                error: null,
              };
            }),
          };
        }
        return {} as any;
      });

      vi.mocked(getAdminClient).mockReturnValue({ from: mockFrom } as any);

      const req = new Request('http://localhost/api/settings/org', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Brand' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.org.name).toBe('New Brand');

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: 'org-1',
          action: 'org.update_name',
          detail: {
            previous_name: 'Old Org',
            new_name: 'New Brand',
          },
        })
      );
    });
  });

  describe('POST /api/settings/start-fresh', () => {
    it('returns 400 if confirmation name does not match current org name', async () => {
      vi.mocked(requireRole).mockResolvedValueOnce({
        user: { id: 'admin-1' } as any,
        profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'orgs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'org-1', name: 'Verdant Skin (demo)' },
              error: null,
            }),
          };
        }
        return {} as any;
      });

      vi.mocked(getAdminClient).mockReturnValue({ from: mockFrom } as any);

      const req = new Request('http://localhost/api/settings/start-fresh', {
        method: 'POST',
        body: JSON.stringify({ confirmationName: 'Wrong Name' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Organisation name does not match');
    });

    it('resets guidelines, facts, terms, and contents, and logs audit entry', async () => {
      vi.mocked(requireRole).mockResolvedValueOnce({
        user: { id: 'admin-1' } as any,
        profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
      });

      const mockIn = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'orgs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'org-1', name: 'Verdant Skin (demo)' },
              error: null,
            }),
          };
        }
        if (table === 'contents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'c-1' }, { id: 'c-2' }],
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            in: mockIn,
            eq: mockEq,
          }),
        };
      });

      vi.mocked(getAdminClient).mockReturnValue({ from: mockFrom } as any);

      const req = new Request('http://localhost/api/settings/start-fresh', {
        method: 'POST',
        body: JSON.stringify({ confirmationName: 'Verdant Skin (demo)' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: 'org-1',
          action: 'org.start_fresh',
          detail: expect.objectContaining({
            org_name: 'Verdant Skin (demo)',
            cleared_contents_count: 2,
          }),
        })
      );
    });
  });
});
