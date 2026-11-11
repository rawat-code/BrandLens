# BrandLens Changelog

All notable changes to the BrandLens pre-publication brand-governance review platform are documented in this file.

---

## [Round 3: "The Finish"] - 2026-11-11

### Added
- **Demo Access Quick Sign-in Grid & Safe Restore**:
  - 1-click persona sign-in grid on `/login` for all 4 roles (`creator`, `manager`, `reviewer`, `admin`) with copyable credential panel.
  - `DEMO_MODE` safety guard: blocks destructive resets on canonical showcase data (HTTP 403) with `org.start_fresh_blocked` audit logging.
  - "Restore demo content" button and modal on `/settings` with idempotent re-seeding.
- **Improvement 1: Source Grounding & Stale Source Detection**:
  - `quote_verified`, `source_hash` (SHA-256), and `source_version` recorded on every finding.
  - Strict enforcement of "NO SOURCE, NO FLAG": ungrounded findings downgraded to `needs_human_check = true` with source cleared.
  - Telemetry: `citations_total`, `citations_verified`, `citations_downgraded` tracked in `ai_runs`.
  - UI `[✓ Verified verbatim]` green badge on verified quotes.
  - Dynamic stale detection: detects when an underlying guideline/fact was modified or retired since review creation and displays "Source changed since this review" with a 1-click "Re-run review" trigger.
  - "Grounding & citation integrity" panel in the AI Disclosure tab.
- **Improvement 2: Deterministic Intent Guard & Dual-Pass Meaning Verification**:
  - Zero-dependency pure module `src/lib/review/intent-guard.ts` evaluating numeric values, percentages, prices, named entities, URLs, hashtags, negations, promotional exaggeration, and brand vocabulary.
  - Dual-pass verification in `suggest.ts`: suggestions receive `intent_check: 'preserved'` only if both the deterministic guard AND Gemini confirm meaning preservation. For confidential drafts, the deterministic guard alone decides.
  - Word-level "What changed" chip diffs rendering inserted words in green and deleted words in strikethrough.
  - "Accept anyway..." workflow for suggestions with altered meaning, requiring an explicit typed justification stored in `intent_override_reason` and logged to `audit_log` as `finding.accept_override`.
- **Improvement 3: Guideline Health Closed-Loop Governance**:
  - `guideline_versions` table tracking complete revision history for every brand guideline.
  - Revision history modal in `/library` with side-by-side visual word diffs between versions.
  - Empirical proposal impact tracking computing before-and-after dispute and dismissal rates within 30-day windows around proposal application date.
  - Statistical safety guard: suppresses percentage metrics when $<5$ findings exist in a window, displaying "Not enough data yet".
  - Contradiction detector `detectConflicts` surfacing potential policy clashes, terminology tensions, and opposing polarities in `/insights`.
- **Supported Content Formats (In-Memory DOCX & PDF Text Extraction)**:
  - Lightweight server-side text extraction using `mammoth` (for `.docx`) and `pdf-parse` (for `.pdf`).
  - Zero document storage guarantee: uploaded files are extracted strictly in volatile memory; buffers are immediately discarded and never persisted to disk, database, or storage buckets.
  - 5 MB maximum file upload limit and 10,000 character maximum extraction limit with automated truncation notice.
  - Drag-and-drop document import dropzone in `ContentForm.tsx`.
- **Judge-Proofing & Concurrency Protection**:
  - Role-aware `StartHereCard` onboarding guide on `/dashboard` with 3-step action blueprints tailored to Creator, Manager, Reviewer, and Admin.
  - "Try with a sample post" 1-click pre-filler in `ContentForm.tsx` containing realistic medical claims and terminology tensions.
  - Optimistic locking and HTTP 409 Conflict handling on status transitions, finding acceptance, and finding disputes.
  - Consolidated `supabase/schema.sql`, `supabase/README.md`, `.nvmrc` (v22.22.1), and comprehensive `.env.example`.

---

## [Round 2: Evaluation & Insights] - 2026-11-07

### Added
- Evaluation benchmark harness (`scripts/eval.ts`) running across 50 realistic synthetic test samples.
- Disputed findings analysis and ambiguity health scoring for guidelines.
- AI-assisted guideline proposal generation based on aggregated creator disputes.
- Append-only audit logging for all governance state mutations.
- Role-based human approval workflows enforcing separation of duties.

---

## [Round 1: Core Foundation] - 2026-11-04

### Added
- Core Next.js 15 App Router architecture with Tailwind CSS.
- Supabase integration with server-mediated queries and RLS.
- Dual-engine review pipeline: deterministic regex rules (`rules.ts`) and Google Gemini API judge (`judge.ts`).
- PII redaction pipeline (`redact.ts`) for masking emails, phone numbers, and API keys.
- Non-destructive content versioning (`v1`, `v2`, `v(N+1)`).

