import { logAudit } from '@/lib/audit';

export const CANONICAL_DEMO_USERS = [
  'creator@verdant.demo',
  'manager@verdant.demo',
  'reviewer@verdant.demo',
  'admin@verdant.demo',
] as const;

export type CanonicalDemoEmail = (typeof CANONICAL_DEMO_USERS)[number];

export const DEMO_PASSWORD_DEFAULT = 'verdant12110';

/**
 * Returns true if the system is running in demo mode.
 * Defaults to true unless DEMO_MODE is explicitly set to 'false'.
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'false') {
    return false;
  }
  return true;
}

/**
 * Returns true if the provided email belongs to one of the 4 canonical demo users.
 */
export function isCanonicalDemoUser(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return CANONICAL_DEMO_USERS.includes(normalized as CanonicalDemoEmail);
}

/**
 * Checks whether modifying or deleting a user is allowed.
 * Prevents role changes, password resets, or account deletions on canonical demo personas.
 */
export async function assertUserMutationAllowed(params: {
  targetEmail: string;
  actorId: string;
  orgId: string;
  action: 'role_change' | 'password_reset' | 'account_delete';
}): Promise<{ allowed: boolean; reason?: string }> {
  if (isCanonicalDemoUser(params.targetEmail)) {
    await logAudit({
      org_id: params.orgId,
      actor: params.actorId,
      action: `demo_user.${params.action}_blocked`,
      detail: {
        target_email: params.targetEmail,
        reason: 'Canonical demo user cannot be modified or deleted in demo workspace',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      allowed: false,
      reason: `User ${params.targetEmail} is a protected demo persona and cannot undergo ${params.action.replace('_', ' ')}.`,
    };
  }

  return { allowed: true };
}
