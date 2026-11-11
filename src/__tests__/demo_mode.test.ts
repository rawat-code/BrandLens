import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDemoMode, isCanonicalDemoUser, assertUserMutationAllowed } from '@/lib/demo-mode';
import * as auditModule from '@/lib/audit';

describe('Stage A: Demo Mode and Demo User Protection', () => {
  const originalEnv = process.env.DEMO_MODE;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalEnv;
  });

  describe('isDemoMode', () => {
    it('defaults to true when DEMO_MODE env var is not set', () => {
      delete process.env.DEMO_MODE;
      expect(isDemoMode()).toBe(true);
    });

    it('returns true when DEMO_MODE is set to true', () => {
      process.env.DEMO_MODE = 'true';
      expect(isDemoMode()).toBe(true);
    });

    it('returns false only when DEMO_MODE is explicitly set to false', () => {
      process.env.DEMO_MODE = 'false';
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('isCanonicalDemoUser', () => {
    it('identifies the 4 canonical demo users correctly', () => {
      expect(isCanonicalDemoUser('creator@verdant.demo')).toBe(true);
      expect(isCanonicalDemoUser('manager@verdant.demo')).toBe(true);
      expect(isCanonicalDemoUser('reviewer@verdant.demo')).toBe(true);
      expect(isCanonicalDemoUser('admin@verdant.demo')).toBe(true);
    });

    it('handles uppercase and whitespace', () => {
      expect(isCanonicalDemoUser('  CREATOR@VERDANT.DEMO ')).toBe(true);
      expect(isCanonicalDemoUser('Admin@Verdant.Demo')).toBe(true);
    });

    it('returns false for custom or third-party emails', () => {
      expect(isCanonicalDemoUser('alice@example.com')).toBe(false);
      expect(isCanonicalDemoUser('creator@otherdomain.com')).toBe(false);
      expect(isCanonicalDemoUser(null)).toBe(false);
      expect(isCanonicalDemoUser(undefined)).toBe(false);
    });
  });

  describe('assertUserMutationAllowed', () => {
    it('blocks mutations on canonical demo users and records audit log', async () => {
      const logAuditSpy = vi.spyOn(auditModule, 'logAudit').mockResolvedValue({ id: 'audit-1' } as unknown as Awaited<ReturnType<typeof auditModule.logAudit>>);

      const result = await assertUserMutationAllowed({
        targetEmail: 'creator@verdant.demo',
        actorId: 'admin-uuid',
        orgId: 'org-uuid',
        action: 'role_change',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('protected demo persona');
      expect(logAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: 'org-uuid',
          actor: 'admin-uuid',
          action: 'demo_user.role_change_blocked',
          detail: expect.objectContaining({
            target_email: 'creator@verdant.demo',
          }),
        })
      );
    });

    it('allows mutations on non-demo accounts without audit block', async () => {
      const logAuditSpy = vi.spyOn(auditModule, 'logAudit').mockResolvedValue({ id: 'audit-1' } as unknown as Awaited<ReturnType<typeof auditModule.logAudit>>);

      const result = await assertUserMutationAllowed({
        targetEmail: 'new-teammate@verdant.com',
        actorId: 'admin-uuid',
        orgId: 'org-uuid',
        action: 'password_reset',
      });

      expect(result.allowed).toBe(true);
      expect(logAuditSpy).not.toHaveBeenCalled();
    });
  });
});
