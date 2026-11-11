# BrandLens Round 3 Progress

> Tracking implementation status across all Round 3 stages. Updated after every numbered item.

- STAGE 0 - AUDIT AND MIGRATION: DONE - Completed Stage 0.1 audit; authored idempotent migration docs/migrations/003_round3.sql and docs/migrations/README.md; Supabase migration confirmed executed.
- STAGE A - DEMO ACCESS ON THE LOGIN PAGE: DONE - AuthCard updated with quick persona sign-in grid and copyable demo credentials panel, DEMO_MODE protection implemented in start-fresh, restore-demo endpoint created, and demo_mode.test.ts passing.
- STAGE B - IMPROVEMENT 1 (FINDINGS BACKED BY SOURCES): DONE - Citation metrics tracked in ai_runs, quote_verified and source_hash stored on findings, stale/deleted source detection with re-run review trigger in UI, Grounding integrity panel in AiDisclosureTab, and 10 passing unit tests in stale_source.test.ts.
- STAGE C - IMPROVEMENT 2 (SUGGESTIONS KEEPING MEANING): DONE - Pure deterministic intent-guard.ts created, dual-pass enforcement in suggest.ts, what-changed chip diffs in Note cards, intent override justification workflow with audit logging in accept route, and 12 passing unit tests in intent_guard.test.ts.
- STAGE D - IMPROVEMENT 3 (GUIDELINE HEALTH CLOSED LOOP): DONE - Guideline version history with diffs in LibraryManager, before-and-after impact tracking with <5 sample safety guard in Insights, contradiction conflict detector, and 8 passing unit tests across conflicts.test.ts and impact.test.ts.
- STAGE E - SUPPORTED CONTENT FORMATS: DONE - Server-side DOCX and PDF text extraction with mammoth and pdf-parse, zero-storage memory-only processing, 10,000 char truncation guard, ContentForm dropzone with Try Sample Post button, and 10 passing unit tests in file_import.test.ts.
- STAGE F - JUDGE-PROOFING: PENDING - Role-aware onboarding card, sample post button, 409 concurrency protection, error boundaries, and full supabase/schema.sql.
- STAGE G - TESTING RECORD AND DOCUMENTATION: PENDING - 10 browser journeys in docs/TESTING.md, CHANGELOG.md, PRIVACY_SECURITY.md, ACCESSIBILITY.md, and ROUND3_PDF_INPUT.md.
- STAGE H - FINAL CHECKS: PENDING - Lint, test, build verification, temporary data cleanup, and FINAL_REPORT_R3.md.
- PASS 2 - EXTENDED ENHANCEMENTS: PENDING - Extra [T2] items (B.6, B.7, C.4, C.5, D.6, D.7, E.2, G.7) awaiting user PASS2 instruction.

---

## Stage 0.1 Audit: What Exists vs. What is Missing

### 1. Improvement 1: Findings Backed by Sources
- **What Exists**:
  - `src/lib/review/judge.ts`: AI prompt requires source citations (`source_type`, `source_id`, `source_quote`). Verifies quote substring against candidate texts.
  - `src/lib/review/pipeline.ts`: Downgrades ungrounded findings to `needs_human_check = true` with source fields cleared.
  - `eval/RESULTS.md`: 1.3% abstention rate measured.
- **What is Missing**:
  - Tracking of citation counts (`citations_total`, `citations_verified`, `citations_downgraded`) in `ai_runs`.
  - Storing `source_version`, `source_hash` (SHA-256), and `quote_verified` on every finding.
  - Stale-source detection: detecting if a library source changed or was deleted since the review and showing "Source changed since this review" / "Source no longer exists" with a re-run button.
  - UI `[✓ Verified verbatim]` badge with distinct icon and text label.
  - "Grounding" panel in AI disclosure tab displaying verification metrics.

### 2. Improvement 2: Suggestions Keeping Creator's Meaning
- **What Exists**:
  - `src/lib/review/suggest.ts`: AI rewrite prompt and secondary Gemini intent check (`preserved` vs `changed`) with plain-English notes.
  - `src/components/ContentDetailView.tsx`: Margin cards showing suggestions with intent badge (`Meaning preserved` / `Meaning may have changed`).
  - `src/app/api/findings/[id]/accept/route.ts`: Non-destructive version creation `v(N+1)` upon human accept.
- **What is Missing**:
  - Pure deterministic module `src/lib/review/intent-guard.ts` checking numbers/percentages/prices/dates, URLs/@mentions/#hashtags, brand terms, negation words, length ratio (0.5–1.6), and promotional inflation.
  - Dual-pass enforcement in `suggest.ts`: `preserved` requires guard pass AND AI confirmation. For confidential drafts, guard alone decides.
  - Storing `intent_reasons` jsonb in findings.
  - UI "What changed" chip diffs (added/removed words).
  - "Accept anyway" workflow when intent is `changed`, requiring typed override justification stored in `intent_override_reason` and logged to `audit_log`.

### 3. Improvement 3: Guideline Health as a Closed Loop
- **What Exists**:
  - `src/lib/insights/aggregation.ts` & `src/lib/insights/health.ts`: 30-day aggregations and ambiguity score calculation.
  - `src/app/api/insights/proposals/generate/route.ts`: Gemini generates revised guideline wording based on disputes.
  - `src/app/api/insights/proposals/[id]/decision/route.ts`: Role-based approval updating guideline text.
- **What is Missing**:
  - `guideline_versions` table tracking version history with change notes and diffs in `/library`.
  - Impact tracking module computing before-and-after dispute/dismiss rates within 30-day windows around `applied_at`, with $<5$ finding "Not enough data yet" safety guard.
  - Pure contradiction detection `src/lib/insights/conflicts.ts` surfacing "Possible conflicts" between guidelines, facts, and terms.
  - Labeling all synthetic records with `is_demo = true` and rendering `[Demo Data]` badges.
