import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, getSessionProfile, UnauthorizedError, ForbiddenError } from '@/lib/auth';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Role Authorization Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('instantiates UnauthorizedError with code 401', () => {
    const error = new UnauthorizedError();
    expect(error.status).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('instantiates ForbiddenError with code 403', () => {
    const error = new ForbiddenError('No permissions');
    expect(error.status).toBe(403);
    expect(error.message).toBe('No permissions');
  });

  it('throws UnauthorizedError when session is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireRole(['admin'])).rejects.toThrow(UnauthorizedError);
  });

  it('throws ForbiddenError when role is not permitted', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          org_id: 'org-456',
          role: 'creator',
          full_name: 'Test Creator',
        },
        error: null,
      }),
    });

    await expect(requireRole(['admin', 'reviewer'])).rejects.toThrow(ForbiddenError);
  });

  it('resolves session when role is permitted', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          org_id: 'org-456',
          role: 'creator',
          full_name: 'Test Creator',
        },
        error: null,
      }),
    });

    const res = await requireRole(['creator', 'manager']);
    expect(res.user.id).toBe('user-123');
    expect(res.profile.role).toBe('creator');
    expect(res.profile.org_id).toBe('org-456');
  });
});
