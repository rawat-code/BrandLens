-- =====================================================================
-- BrandLens Consolidated Database Schema
-- Complete, reproducible, and idempotent schema for Supabase PostgreSQL
-- =====================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Profiles (mapped 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('creator', 'manager', 'reviewer', 'admin')),
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- 4. Guidelines Library
CREATE TABLE IF NOT EXISTS guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  body text NOT NULL,
  clarification text,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Guideline Revision History
CREATE TABLE IF NOT EXISTS guideline_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id uuid NOT NULL REFERENCES guidelines(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  clarification text,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz DEFAULT now()
);

-- 6. Guideline Proposals (AI-Assisted Governance Clarifications)
CREATE TABLE IF NOT EXISTS guideline_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  guideline_id uuid REFERENCES guidelines(id) ON DELETE SET NULL,
  rule_key text,
  proposed_text text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7. Guideline Gaps (Un-grounded recurring topics)
CREATE TABLE IF NOT EXISTS guideline_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  topic text NOT NULL,
  example_excerpts jsonb,
  finding_count integer DEFAULT 1,
  status text DEFAULT 'open' CHECK (status IN ('open', 'addressed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- 8. Approved Clinical & Operational Facts
CREATE TABLE IF NOT EXISTS facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  statement text NOT NULL,
  source_note text,
  owner text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'retired', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- 9. Terminology Dictionary (Banned, Caution, Preferred)
CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  term text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('banned', 'caution', 'preferred')),
  replacement text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- 10. Content Drafts
CREATE TABLE IF NOT EXISTS contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel text NOT NULL,
  audience text,
  confidential boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ai_reviewed', 'needs_changes', 'in_review', 'approved', 'rejected', 'published')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. Content Versions (Non-destructive version history)
CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  body text NOT NULL,
  note text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (content_id, version)
);

-- 12. Audit Findings (Citations, Grounding & Meaning Checks)
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  rule_key text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('rule', 'ai')),
  category text NOT NULL CHECK (category IN ('terminology', 'tone', 'messaging', 'claim', 'fact', 'visual', 'accessibility', 'security')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  confidence numeric NOT NULL DEFAULT 1.0,
  excerpt text,
  start_idx integer,
  end_idx integer,
  reason text NOT NULL,
  source_type text CHECK (source_type IN ('guideline', 'fact', 'term') OR source_type IS NULL),
  source_id text,
  source_quote text,
  source_version integer,
  source_hash text,
  quote_verified boolean DEFAULT false,
  suggestion text,
  suggestions jsonb,
  intent_check text CHECK (intent_check IN ('preserved', 'changed') OR intent_check IS NULL),
  intent_note text,
  intent_reasons jsonb,
  intent_override_reason text,
  needs_human_check boolean NOT NULL DEFAULT false,
  requires_reviewer boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'disputed', 'dismissed', 'resolved')),
  dispute_reason text,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 13. AI Audit Runs (Grounding & Verification Telemetry)
CREATE TABLE IF NOT EXISTS ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  model text,
  used_ai boolean NOT NULL,
  skipped_reason text,
  redactions integer NOT NULL DEFAULT 0,
  sent_preview text,
  rule_count integer NOT NULL DEFAULT 0,
  ai_count integer NOT NULL DEFAULT 0,
  citations_total integer DEFAULT 0,
  citations_verified integer DEFAULT 0,
  citations_downgraded integer DEFAULT 0,
  is_demo boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

-- 14. Append-Only Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  actor uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  content_id uuid REFERENCES contents(id) ON DELETE SET NULL,
  detail jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 15. Human Feedback Comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  author uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- Performance Indexes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_guidelines_org_id ON guidelines(org_id);
CREATE INDEX IF NOT EXISTS idx_guideline_versions_guideline_id ON guideline_versions(guideline_id);
CREATE INDEX IF NOT EXISTS idx_guideline_versions_created_at ON guideline_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guideline_proposals_org_id ON guideline_proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_guideline_proposals_status ON guideline_proposals(status);
CREATE INDEX IF NOT EXISTS idx_guideline_gaps_org_id ON guideline_gaps(org_id);
CREATE INDEX IF NOT EXISTS idx_facts_org_id ON facts(org_id);
CREATE INDEX IF NOT EXISTS idx_terms_org_id ON terms(org_id);
CREATE INDEX IF NOT EXISTS idx_contents_org_id ON contents(org_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_findings_content_id_version ON findings(content_id, version);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_ai_runs_content_id ON ai_runs(content_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id);

-- =====================================================================
-- Row Level Security (RLS) Configuration
-- Non-negotiable architectural rule: All database mutations and reads
-- route through server code via service role client after requireRole().
-- Public anon policies are disabled by default.
-- =====================================================================
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

