import { getAdminClient } from '@/lib/supabase/admin';

export interface LogAuditParams {
  org_id: string;
  actor: string;
  action: string;
  content_id?: string | null;
  detail?: Record<string, unknown>;
}

/**
 * Appends an entry to the organization's audit_log table.
 * Must be called for any state change, governance rule update, or workflow decision.
 */
export async function logAudit({
  org_id,
  actor,
  action,
  content_id,
  detail = {},
}: LogAuditParams) {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('audit_log')
      .insert({
        org_id,
        actor,
        action,
        content_id: content_id || null,
        detail,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert audit log entry:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in logAudit:', err);
    return null;
  }
}
