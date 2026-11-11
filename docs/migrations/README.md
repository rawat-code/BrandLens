# BrandLens Database Migrations

This directory contains database migrations for the BrandLens platform.

---

## Migration Execution Order

When deploying updates to production or running against a Supabase database:

1. **Run the SQL in Supabase First**:
   - Open your **Supabase Dashboard** > **SQL Editor**.
   - Copy the contents of [`003_round3.sql`](003_round3.sql).
   - Click **Run** to execute the idempotent migration.
2. **Deploy Application Code (Merge)**:
   - Merge the `feat/round3` branch into `main` and push to GitHub.
   - Vercel will trigger a production deployment with the code that queries the new columns and tables.

---

## Migration Catalog

| Migration File | Stage | Purpose |
| :--- | :---: | :--- |
| [`003_round3.sql`](003_round3.sql) | **Round 3 ("The Finish")** | Adds source verification fields (`source_version`, `source_hash`, `quote_verified`), intent verification fields (`intent_reasons`, `suggestions`, `intent_override_reason`), citation telemetry (`citations_total`, `citations_verified`, `citations_downgraded`), `is_demo` tracking, `applied_at` on proposals, `guideline_versions` table for revision history, and `guideline_gaps` table for gap clustering. |

---

## Idempotency & Safety Guarantees

All migration scripts are strictly idempotent:
- Uses `ADD COLUMN IF NOT EXISTS` on existing tables (`findings`, `ai_runs`, `guideline_proposals`).
- Uses `CREATE TABLE IF NOT EXISTS` for new relational tables (`guideline_versions`, `guideline_gaps`).
- Row Level Security (RLS) is enabled immediately on all new tables with zero public access policies, enforcing server-mediated service-role queries only.
- Does not modify or drop existing data, foreign keys, or audit logs.
