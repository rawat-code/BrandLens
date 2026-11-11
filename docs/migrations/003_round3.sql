-- =====================================================================
-- BrandLens Round 3 Migration: 003_round3.sql
-- Idempotent schema upgrades for Round 3 ("The Finish")
-- Safe to execute against existing Supabase PostgreSQL databases
-- =====================================================================

-- 1. Findings table enhancements: source grounding, intent verification, demo flag
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS source_version integer;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS source_hash text;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS quote_verified boolean DEFAULT false;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS intent_reasons jsonb;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS suggestions jsonb;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS intent_override_reason text;
ALTER TABLE IF EXISTS findings ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- 2. AI Runs telemetry enhancements: citation counts, demo flag
ALTER TABLE IF EXISTS ai_runs ADD COLUMN IF NOT EXISTS citations_total integer DEFAULT 0;
ALTER TABLE IF EXISTS ai_runs ADD COLUMN IF NOT EXISTS citations_verified integer DEFAULT 0;
ALTER TABLE IF EXISTS ai_runs ADD COLUMN IF NOT EXISTS citations_downgraded integer DEFAULT 0;
ALTER TABLE IF EXISTS ai_runs ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- 3. Guideline Proposals enhancement: applied timestamp for impact tracking
ALTER TABLE IF EXISTS guideline_proposals ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- 4. Guideline Versions table: revision history and readable diffs
CREATE TABLE IF NOT EXISTS guideline_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id uuid NOT NULL REFERENCES guidelines(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  clarification text,
  changed_by uuid REFERENCES profiles(id),
  change_note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS with zero public policies (server-mediated access only via service role)
ALTER TABLE guideline_versions ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup by guideline_id and version
CREATE INDEX IF NOT EXISTS idx_guideline_versions_guideline_id ON guideline_versions(guideline_id);
CREATE INDEX IF NOT EXISTS idx_guideline_versions_created_at ON guideline_versions(created_at DESC);

-- 5. Guideline Gaps table: un-grounded topic clusters for governance recommendations
CREATE TABLE IF NOT EXISTS guideline_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  topic text NOT NULL,
  example_excerpts jsonb,
  finding_count integer DEFAULT 1,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS with zero public policies
ALTER TABLE guideline_gaps ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup by org_id and status
CREATE INDEX IF NOT EXISTS idx_guideline_gaps_org_id ON guideline_gaps(org_id);
CREATE INDEX IF NOT EXISTS idx_guideline_gaps_status ON guideline_gaps(status);
