import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { UserRole, Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Access forbidden: insufficient role permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface SessionProfile {
  user: User;
  profile: Profile;
}

/**
 * Returns current authenticated user and their profile (including org_id and role).
 * Returns null if not authenticated or profile not found.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const admin = getAdminClient();
    const { data: initialProfile, error: profileError } = await admin
      .from('profiles')
      .select('id, org_id, role, full_name, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    let profile = initialProfile;

    // Auto-provision profile for authenticated user if not yet in database
    if (!profile) {
      try {
        let orgId: string | null = null;
        const { data: org } = await admin
          .from('orgs')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (org) {
          orgId = org.id;
        } else {
          const newOrgId = crypto.randomUUID();
          await admin.from('orgs').insert({ id: newOrgId, name: 'Verdant Skin' });
          orgId = newOrgId;
        }

        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Creator';

        const { data: newProfile, error: insertError } = await admin
          .from('profiles')
          .insert({
            id: user.id,
            org_id: orgId,
            full_name: fullName,
            role: 'creator',
          })
          .select('id, org_id, role, full_name, created_at')
          .maybeSingle();

        if (!insertError && newProfile) {
          profile = newProfile;
        }
      } catch (provisionErr) {
        console.error('Error auto-provisioning profile in getSessionProfile:', provisionErr);
      }
    }

    if (!profile) {
      return null;
    }

    let orgName: string | undefined;
    if (profile.org_id) {
      const { data: org } = await admin
        .from('orgs')
        .select('name')
        .eq('id', profile.org_id)
        .maybeSingle();
      if (org?.name) {
        orgName = org.name;
      }
    }

    return {
      user,
      profile: {
        ...(profile as Profile),
        org_name: orgName,
      },
    };
  } catch (err) {
    console.error('Error fetching session profile:', err);
    return null;
  }
}

/**
 * Enforces role-based access control.
 * Throws UnauthorizedError (401) if not logged in.
 * Throws ForbiddenError (403) if role is not in allowedRoles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionProfile> {
  const session = await getSessionProfile();

  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!allowedRoles.includes(session.profile.role)) {
    throw new ForbiddenError(
      `Access forbidden for role: ${session.profile.role}. Required: ${allowedRoles.join(', ')}`
    );
  }

  return session;
}

