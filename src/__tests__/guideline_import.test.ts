/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/library/guidelines/import/route';
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

describe('POST /api/library/guidelines/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin users with 403', async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(new ForbiddenError('Forbidden'));

    const req = new Request('http://localhost/api/library/guidelines/import', {
      method: 'POST',
      body: JSON.stringify({
        guidelines: [
          {
            title: 'Test',
            category: 'tone',
            body: 'Body text',
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when payload is empty or invalid', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      user: { id: 'admin-1' } as any,
      profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
    });

    const req = new Request('http://localhost/api/library/guidelines/import', {
      method: 'POST',
      body: JSON.stringify({ guidelines: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('inserts guidelines in batch and records audit log', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      user: { id: 'admin-1' } as any,
      profile: { id: 'admin-1', org_id: 'org-1', role: 'admin', full_name: 'Admin' },
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'g-1', title: 'Guideline 1' },
          { id: 'g-2', title: 'Guideline 2' },
        ],
        error: null,
      }),
    });

    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as any);

    const req = new Request('http://localhost/api/library/guidelines/import', {
      method: 'POST',
      body: JSON.stringify({
        guidelines: [
          { title: 'Guideline 1', category: 'tone', body: 'Tone guidance' },
          { title: 'Guideline 2', category: 'claim', body: 'Claim guidance' },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        action: 'library.guidelines.import',
        detail: {
          count: 2,
          titles: ['Guideline 1', 'Guideline 2'],
        },
      })
    );
  });
});
