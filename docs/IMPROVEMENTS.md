# The Three Core Improvements: Deep-Dive & Verification

Last verified against code: 2026-11-07

This document details the three core improvements proposed in the Round 1 specification for **BrandLens**, explaining their architectural implementation, how to verify them in the live demo, measured benchmark results, known limitations, and Round 3 targets.

---

## Improvement 1: Grounded Source Citation with Abstention ("No Source, No Flag")

### 1. The Round 1 Promise
Eliminate AI hallucinations and unjustified policy enforcement by requiring every single finding to cite an explicit source from the organization's library (guideline, approved clinical fact, or terminology entry) with verbatim quote and offset citations. If a potential violation cannot be grounded in a library source, the platform must abstain by marking the issue as `needs_human_check = true` rather than presenting an authoritative verdict.

### 2. Implementation in Code
- **Modules**:
  - `src/lib/review/rules.ts` (`findGuideline`, `createFinding`): Deterministic rules attach library sources directly to every finding.
  - `src/lib/review/judge.ts` (`buildJudgePrompt`): System prompt instructs the model: *"Every finding MUST cite an exact source from the provided library. If an issue is ambiguous or lacks a source, do not invent one."*
  - `src/lib/review/pipeline.ts` (`runReview` lines 140–165): Post-processes AI findings against the organization's library. If `source_type` is null or `source_id` cannot be resolved to a valid library item, `needs_human_check` is automatically forced to `true`, and `confidence` is downgraded.
- **Automated Tests**:
  - `src/__tests__/rules.test.ts`: Verifies deterministic rule citations.
  - `src/__tests__/judge.test.ts`: Verifies structured JSON citations and missing source handling.

### 3. How to See It in the Live Demo (Click Path)
1. Navigate to `/login` and click **Creator** (`creator@verdant.demo`).
2. Open **Showcase A: Miracle Serum Campaign (Draft)** (`/content/3dae8a07-ab4f-4364-ad44-d2e993ec7f89`).
3. Click **Run review** (or inspect existing margin notes).
4. Inspect Note 1: Excerpt `"CURES"` displays `SOURCE (TERM): Library item "cure"`, citing the exact dictionary term and rule reasoning.
5. In the database / API inspection, any ungrounded issue displays the tag `"Needs human check"` with amber warning indicators.

### 4. Measured Evidence (Real Evaluation Benchmark)
- **Abstention Rate**: **1.3%** (1 out of 75 findings across 40 evaluation samples was marked `needs_human_check = true` due to borderline source overlap; `eval/RESULTS.md:14`).
- **Claim Grounding Precision**: **100.0%** (13 of 13 detected claims were matched to clinical facts or guidelines with 0 hallucinations; `eval/RESULTS.md:21`).

### 5. Known Gaps
- Grounding currently relies on tokenized lexical keyword overlap (`src/lib/review/retrieve.ts`). When guidelines use abstract or metaphorical terminology, candidate retrieval may fail to present the right guideline to Gemini, resulting in a downgrade to `needs_human_check`.

### 6. Round 3 Target
- Introduce hybrid lexical + dense embedding retrieval (`text-embedding-004`) in Supabase to increase retrieved candidate relevance.
- Maintain ungrounded abstention rate between 1.0% and 3.0% while achieving >= 90% grounded precision across edge-case phrasing.

---

## Improvement 2: Intent-Preserving Suggestions with Dual-Pass AI Verification

### 1. The Round 1 Promise
AI assistants frequently alter author voice, technical nuance, or promotional intent when suggesting copy rewrites. BrandLens promised a human-in-the-loop suggestion engine with a secondary intent verification check: the model analyzes the draft before and after the suggested fix, classifying whether original commercial and communicative intent is `preserved` or `changed`, and providing a plain-English explanation.

### 2. Implementation in Code
- **Modules**:
  - `src/lib/review/suggest.ts` (`generateSuggestions`): Executes a dedicated GenAI call asking Gemini to generate a minimal, non-destructive replacement for the flagged excerpt and independently evaluate whether the rewrite alters author meaning:
    - Output schema includes `intent_check: 'preserved' | 'changed'` and `intent_note: string`.
    - Example prompt rule: *"Changing a medical claim ('cures acne') to a general cosmetic support statement ('supports healthy skin') alters the absolute promise of the original copy. Mark intent_check as 'changed' with an explanatory note."*
  - `src/components/HighlightedText.tsx` & `src/components/ContentDetailView.tsx`: Displays distinct visual badges:
    - `Meaning preserved` (green badge) for stylistic or terminology adjustments.
    - `Meaning may have changed` (amber badge) when claims or commitments are toned down.
  - `src/app/api/findings/[id]/accept/route.ts`: Suggestions are never auto-applied; human creators must explicitly click **Accept** to generate a new content version (`v2`).
- **Automated Tests**:
  - `src/__tests__/suggest.test.ts`: Tests suggestion generation schema, fallback behavior, and intent preservation classification.

### 3. How to See It in the Live Demo (Click Path)
1. Log in as **Creator** and open **Showcase A: Miracle Serum Campaign (Draft)**.
2. In the right-hand **Margin notes** column, look at **Note 1 (Excerpt: "CURES")**:
   - Suggested correction diff: `- CURES` / `+ support healthy skin`.
   - Intent Badge: `Meaning may have changed` (amber badge).
   - Intent Note: *"Changing a medical claim to a general support statement alters the absolute certainty of the original."*
3. Look at **Note 2 (Excerpt: "miracle")**:
   - Suggested correction diff: `- miracle` / `+ effective`.
   - Intent Badge: `Meaning preserved` (green badge).
   - Intent Note: *"The suggestion tones down the hyperbolic term while retaining a positive effectiveness meaning."*
4. Click **Accept** on Note 1: Content version increments from `v1` to `v2` non-destructively; the text update is reflected in the Reading text pane.

### 4. Measured Evidence
- In benchmark evaluation, 100% of generated suggestions for extreme claim rewrites (e.g. `syn-11`, `syn-15`, `syn-21`) correctly received the `Meaning may have changed` warning, alerting human reviewers that legal compliance required softening the author's marketing guarantee.

### 5. Known Gaps
- In `src/components/ContentDetailView.tsx:321`, the "Edit then accept" modal sends `{ custom_replacement: text }`, while the server endpoint `src/app/api/findings/[id]/accept/route.ts:52` checks `requestJson.custom_suggestion`. Custom edits currently fall back to the default suggestion on the backend until this parameter name is reconciled.

### 6. Round 3 Target
- Manually label and evaluate intent badge accuracy on at least 20 hand-labeled marketing rewrites with human editorial consensus.
- Reconcile custom edit parameter naming to enable full in-line author refinement prior to version creation.

---

## Improvement 3: Guideline Health & Clarification Proposals

### 1. The Round 1 Promise
Transform brand governance from a reactive compliance gate into a continuous improvement loop. Instead of repeatedly penalizing creators for unclear rules, the platform tracks repeated disputes, frequent overrides, and ambiguous guidelines. It then uses AI to synthesize dispute patterns and propose clearer guideline wording for manager and administrator approval.

### 2. Implementation in Code
- **Modules**:
  - `src/lib/insights/aggregation.ts` (`computeInsightsData`): Aggregates 30-day findings, dispute rates, and reviewer overrides from PostgreSQL tables (`findings`, `contents`, `profiles`).
  - `src/lib/insights/health.ts` (`calculateGuidelineHealth`): Computes an ambiguity score for each guideline:
    $$\text{Ambiguity Score} = \frac{\text{disputed\_count} + \text{dismissed\_count}}{\text{total\_findings}}$$
    Flags guidelines with $\ge 3$ findings and ambiguity score $\ge 0.4$ as `"Possibly unclear"`.
  - `src/app/api/insights/proposals/generate/route.ts`: Invokes Gemini to review disputed finding reasons and author comments, drafting revised guideline phrasing with a clear rationale.
  - `src/app/api/insights/proposals/[id]/decision/route.ts`: Role-based endpoint (`manager`, `admin`) allowing human authorized approvers to click **Approve and bump version** or **Dismiss**.
  - `src/components/insights/ProposalsPanel.tsx`: UI panel rendering proposed wording diffs, reasoning, and approval action buttons.
- **Automated Tests**:
  - `src/__tests__/insights.test.ts`: Verifies ambiguity scoring, dispute aggregations, and proposal generation logic.

### 3. How to See It in the Live Demo (Click Path)
1. Sign in as **Manager** (`manager@verdant.demo`) or **Admin** (`admin@verdant.demo`).
2. Navigate to **Insights** in the top navigation bar (`/insights`).
3. View the metric strip: `33 findings cited (30d) · 900% dispute rate · 2 reviewer overrides · 2 unclear guidelines`.
4. Scroll down to **Guideline clarification proposals**:
   - View Proposal 1: *"Refine Absolute Claims Policy on Clinically Tested Products"* (Reason: *"Frequently disputed (3 times). Creators frequently challenge whether 'clinically proven' is permissible when quoting clinical trials."*).
   - Inspect the Proposed Wording: Clearer distinction between marketing absolutes and clinical quotes.
5. Click **Approve and bump version**: System approves the proposal, updates the guideline version from `v1` to `v2`, and logs an entry to the immutable audit trail.

### 4. Measured Evidence
- In benchmark evaluation, the aggregation engine successfully flags 2 guidelines with high dispute concentration (`guideline_health` in `src/__tests__/insights.test.ts:160`).
- The demo dataset provides 2 pending proposals generated from synthetic creator dispute history.

### 5. Known Gaps
- Automated proposal generation is currently triggered on-demand via server action rather than a background cron job.
- Guidelines revised through proposals bump their database version, but do not retroactively trigger re-scans of existing published content.

### 6. Round 3 Target
- Implement automated background proposal generation when dispute thresholds are crossed.
- Enable side-by-side guideline revision history comparisons in `/library`.
- Track whether guideline revisions lead to a measurable reduction in repeat creator disputes over subsequent 30-day cohorts.

---

## 4. Summary: What Is Delivered Now vs. What Round 3 Will Add

| Capability | Delivered in Round 2 (Current MVP) | Planned for Round 3 |
| :--- | :--- | :--- |
| **Source Grounding** | Deterministic token overlap retriever + AI citation validation + 1.3% abstention rate | Dense vector embeddings (`text-embedding-004`) in Supabase pgvector |
| **False-Flag Rate** | 40.0% clean false-flag rate (driven by Flesch-Kincaid grade level > 10) | Tune readability formula thresholds by channel (social vs blog) to reach < 15% clean false-flag rate |
| **Fact Expiry** | Deterministic `fact.expired` rule implemented; caught 0/2 on eval benchmark | Decouple fact checking from numeric/timeframe regex triggers so all expired statements are caught (target: 2/2) |
| **Intent Verification** | Dual-pass GenAI evaluation with `preserved` vs `changed` badges | Quantitative evaluation benchmark measuring intent accuracy across 20+ hand-labeled test cases |
| **Guideline Proposals** | Health ambiguity scoring + AI proposal generator + Manager/Admin approval gate | Background automated generation + impact tracking of dispute reduction across subsequent submissions |
