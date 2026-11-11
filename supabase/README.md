# BrandLens Supabase Database Setup

This directory contains the canonical consolidated PostgreSQL schema and instructions for setting up the BrandLens database in Supabase.

---

## 1. Quick Setup via Supabase Web Dashboard

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project.
   - Note down your database password and wait for the project to provision.

2. **Execute Consolidated Schema**:
   - Navigate to the **SQL Editor** in the left sidebar.
   - Open [schema.sql](./schema.sql), copy its entire contents, paste them into the SQL Editor, and click **Run**.
   - All 14 tables, indexes, constraints, and Row Level Security configurations will be initialized idempotently.

3. **Retrieve API Keys**:
   - Go to **Project Settings** &rarr; **API**.
   - Copy:
     - `Project URL` &rarr; `NEXT_PUBLIC_SUPABASE_URL`
     - `anon / public key` &rarr; `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role key` (secret) &rarr; `SUPABASE_SERVICE_ROLE_KEY`

4. **Populate Demo Brand ("Verdant Skin")**:
   - Set the keys in your `.env` file (see `.env.example`).
   - Run the demo seed script:
     ```bash
     npm run seed
     ```
   - This creates the 4 canonical demo personas (`creator@verdant.demo`, `manager@verdant.demo`, `reviewer@verdant.demo`, `admin@verdant.demo`), guidelines, facts, terms, and 5 audited showcase content drafts.

---

## 2. Row Level Security (RLS) Architecture

BrandLens adheres to a zero-trust server-mediated security model:
- **Zero Public Access**: RLS is enabled across every single table without public anon policies.
- **Server-Side Enforcement**: All database queries are executed server-side using the `SUPABASE_SERVICE_ROLE_KEY` exclusively **after** verifying caller identity and role via `requireRole(...)`.
- **Multi-Tenant Isolation**: Every operational query strictly filters on `org_id`.

---

## 3. Migration History

For incremental deployments across existing databases, individual migration scripts are maintained in `docs/migrations/`:
- `001_initial.sql`: Base tables and workflow schemas.
- `002_insights.sql`: Guideline proposals and insights aggregation support.
- `003_round3.sql`: Source grounding hashes (`source_hash`), quote verification, deterministic intent metadata (`intent_reasons`), guideline version history (`guideline_versions`), and proposal impact tracking (`applied_at`).
