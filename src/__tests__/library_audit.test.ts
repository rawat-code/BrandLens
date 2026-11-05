import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit } from '@/lib/audit';
import * as adminModule from '@/lib/supabase/admin';

describe('logAudit helper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts audit log entry with service-role admin client', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 42, action: 'library.guideline.create' },
          error: null,
        }),
      }),
    });

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as ReturnType<typeof adminModule.getAdminClient>;

    vi.spyOn(adminModule, 'getAdminClient').mockReturnValue(mockAdmin);

    const result = await logAudit({
      org_id: 'org-123',
      actor: 'user-456',
      action: 'library.guideline.create',
      detail: { guideline_id: 'g-1' },
    });

    expect(mockAdmin.from).toHaveBeenCalledWith('audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      org_id: 'org-123',
      actor: 'user-456',
      action: 'library.guideline.create',
      content_id: null,
      detail: { guideline_id: 'g-1' },
    });
    expect(result).toEqual({ id: 42, action: 'library.guideline.create' });
  });

  it('handles database insert errors gracefully without throwing', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database constraint error' },
        }),
      }),
    });

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as ReturnType<typeof adminModule.getAdminClient>;

    vi.spyOn(adminModule, 'getAdminClient').mockReturnValue(mockAdmin);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await logAudit({
      org_id: 'org-123',
      actor: 'user-456',
      action: 'library.guideline.create',
    });

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
