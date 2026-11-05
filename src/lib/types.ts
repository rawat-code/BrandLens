export type UserRole = 'creator' | 'manager' | 'reviewer' | 'admin';
export type Role = UserRole;

export type ContentStatus =
  | 'draft'
  | 'ai_reviewed'
  | 'needs_changes'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published';

export type FindingOrigin = 'rule' | 'ai';

export type FindingCategory =
  | 'terminology'
  | 'tone'
  | 'messaging'
  | 'claim'
  | 'fact'
  | 'visual'
  | 'accessibility'
  | 'security';

export type FindingSeverity = 'low' | 'medium' | 'high';

export type FindingSourceType = 'guideline' | 'fact' | 'term' | null;

export type FindingIntentCheck = 'preserved' | 'changed' | null;

export type FindingStatus = 'open' | 'accepted' | 'disputed' | 'dismissed' | 'resolved';

export interface Profile {
  id: string;
  org_id: string;
  role: UserRole;
  full_name: string | null;
  created_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at?: string;
}

export interface Guideline {
  id: string;
  org_id: string;
  title: string;
  category: string;
  body: string;
  clarification?: string | null;
  version: number;
  updated_at?: string;
  created_by?: string | null;
}

export interface Fact {
  id: string;
  org_id: string;
  statement: string;
  source_note?: string | null;
  owner?: string | null;
  expires_at?: string | null;
  status: 'approved' | 'retired' | 'expired';
  created_at?: string;
}

export type TermKind = 'banned' | 'caution' | 'preferred';

export interface Term {
  id: string;
  org_id: string;
  term: string;
  kind: TermKind;
  replacement?: string | null;
  note?: string | null;
  created_at?: string;
}

export interface Content {
  id: string;
  org_id: string;
  title: string;
  channel: string;
  audience?: string | null;
  confidential: boolean;
  status: ContentStatus;
  created_by: string;
  current_version: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version: number;
  body: string;
  created_by?: string | null;
  note?: string | null;
  created_at?: string;
}

export interface Finding {
  id: string;
  content_id: string;
  version: number;
  rule_key: string;
  origin: FindingOrigin;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number;
  excerpt?: string | null;
  start_idx?: number | null;
  end_idx?: number | null;
  reason: string;
  source_type: FindingSourceType;
  source_id?: string | null;
  source_quote?: string | null;
  suggestion?: string | null;
  intent_check: FindingIntentCheck;
  intent_note?: string | null;
  needs_human_check: boolean;
  requires_reviewer: boolean;
  status: FindingStatus;
  dispute_reason?: string | null;
  created_at?: string;
}

export interface AuditLogEntry {
  id: string | number;
  org_id: string;
  content_id?: string | null;
  actor: string;
  action: string;
  detail?: Record<string, unknown> | null;
  created_at?: string;
}

