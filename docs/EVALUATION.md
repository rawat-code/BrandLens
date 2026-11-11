# BrandLens Evaluation Benchmark & Quality Audit

Last verified against code: 2026-11-07

This document reports the empirical evaluation benchmark for **BrandLens**, measuring review accuracy, precision, recall, false-positive behaviors, and abstention safeguards against a controlled test dataset.

---

## 1. Benchmark Dataset & Methodology

### Dataset Specification
- **Dataset File**: [`eval/data/samples.json`](file:///home/kira/Downloads/BrandLens/eval/data/samples.json)
- **Scope**: 40 synthetic marketing samples developed for the fictional botanical skincare brand **Verdant Skin**.
- **Sample Distribution**:
  - **10 Clean Posts** (`syn-01` to `syn-10`): Completely compliant copy (sourcing stories, packaging milestones, routine tips). Evaluates false-positive rate.
  - **30 Violation Posts** (`syn-11` to `syn-40`): Targeted policy violations spanning medical cure claims, banned words, caution terms, absolute promises, expired promotional facts, accessibility errors (all-caps, vague links, emoji flooding, missing alt text), and adversarial prompt injections.

> **Dataset Integrity Notice**: All benchmark samples represent synthetic test data created specifically for evaluation. No real proprietary or brand-specific customer data was used.

### Execution Command
The benchmark evaluation suite is executed with:
```bash
npm run eval
# or directly:
tsx --env-file=.env scripts/eval.ts
```

### Metric Definitions
- **Precision**: $\frac{\text{True Positives}}{\text{True Positives} + \text{False Positives}}$ (Proportion of flagged issues that represent actual violations).
- **Recall**: $\frac{\text{True Positives}}{\text{True Positives} + \text{False Negatives}}$ (Proportion of actual violations successfully flagged).
- **F1 Score**: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$ (Harmonic balance of precision and recall).
- **Clean False-Flag Rate**: $\frac{\text{Clean Posts with}\ge 1\text{ Flag}}{\text{Total Clean Posts}}$ (Measures author interruption on compliant copy).
- **Abstention Rate**: $\frac{\text{Findings with } needs\_human\_check = true}{\text{Total Generated Findings}}$ (Frequency of platform falling back to human review when direct source citation is uncertain).

---

## 2. Empirical Benchmark Results

> **Benchmark Execution Date**: `Fri, 06 Nov 2026 12:09:40 GMT`  
> **Source Artifact**: Generated automatically by `scripts/eval.ts` into [`eval/RESULTS.md`](file:///home/kira/Downloads/BrandLens/eval/RESULTS.md) and [`eval/results.json`](file:///home/kira/Downloads/BrandLens/eval/results.json).

### Executive Summary Metrics

| Metric | Score | Evaluation Note |
| :--- | :---: | :--- |
| **Overall Recall** | **94.3%** | 33 of 35 targeted violation rules successfully identified. |
| **Overall Precision** | **56.9%** | Impacted by aggressive readability linters and broad tone matching. |
| **Overall F1 Score** | **71.0%** | Robust governance baseline prioritizing safety and non-leakage of violations. |
| **Clean False-Flag Rate** | **40.0%** | 4 out of 10 clean posts flagged (all 4 caused by `a11y.readability`). |
| **Abstention Rate** | **1.3%** | 1 out of 75 findings flagged as `needs_human_check = true` without authoritative claim. |

### Performance Breakdown by Category

| Category | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Terminology** | 10 | 4 | 0 | 71.4% | 100.0% | 83.3% |
| **Claim** | 13 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| **Fact** | 0 | 0 | 2 | 100.0% | 0.0% | 0.0% |
| **Accessibility** | 8 | 14 | 0 | 36.4% | 100.0% | 53.3% |
| **Security** | 2 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| **Tone** | 0 | 7 | 0 | 0.0% | 100.0% | 0.0% |

---

## 3. Detailed Audit of Partial & Failing Samples

| Sample ID | Sample Title | Type | Status | Expected Rule(s) | Detected Rule(s) | Root Cause Analysis |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `syn-04` | Glass Packaging Milestone | Clean | ⚠️ Partial | `none` | `a11y.readability` | Clean post triggered Flesch-Kincaid grade level > 10. |
| `syn-05` | Clean Formulation Promise | Clean | ⚠️ Partial | `none` | `a11y.readability` | Clean post triggered Flesch-Kincaid grade level > 10. |
| `syn-07` | Dermatological Sensitivity Trial | Clean | ⚠️ Partial | `none` | `a11y.readability` | Clinical trial vocabulary triggered grade level > 10. |
| `syn-10` | Ethical Cultivation Overview | Clean | ⚠️ Partial | `none` | `a11y.readability` | Multi-syllable botanical terms triggered grade level > 10. |
| `syn-23` | 7 Days Timeframe Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` | Benchmark expected `claim.timeframe`; engine classified under `claim.unsupported`. |
| `syn-24` | Overnight Transformation Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` | Benchmark expected `claim.timeframe`; engine classified under `claim.unsupported`. |
| `syn-25` | 48 Hours Timeframe Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` | Benchmark expected `claim.timeframe`; engine classified under `claim.unsupported`. |
| `syn-26` | Unsupported Numeric Percentage Claim | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `a11y.readability, ai.claim.*` | Numeric claim matched AI claim guideline instead of deterministic regex key. |
| `syn-27` | Unsupported Statistical Metric | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `ai.claim.*` | Caught by AI judge rather than deterministic rule key. |
| `syn-28` | Unsupported Survey Claim | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `a11y.readability, ai.claim.*` | Caught by AI judge rather than deterministic rule key. |
| `syn-29` | Expired Discount Fact Reference | Violation | ⚠️ Partial | `fact.expired` | `ai.tone.the_content_uses_agg` | **Missed expired fact**: `rules.ts` only checks facts when numeric/timeframe regex triggers. |
| `syn-30` | Expired Monsoon Kit Fact Reference | Violation | ⚠️ Partial | `fact.expired` | `a11y.readability, ai.tone.*` | **Missed expired fact**: Non-numeric promotional statement bypassed fact check in `rules.ts`. |
| `syn-37` | Missing Alt Text in Image | Violation | ⚠️ Partial | `a11y.image_alt` | `term.preferred_variant, a11y.alt_missing` | Rule naming difference: engine generated `a11y.alt_missing` rather than `a11y.image_alt`. |
| `syn-40` | Multi-Violation Compound Post | Violation | ⚠️ Partial | `term.preferred_variant, term.banned, claim.timeframe, a11y.vague_link` | `term.preferred_variant, term.banned, claim.unsupported, a11y.vague_link, ai.tone.*` | Timeframe sub-claim flagged as `claim.unsupported` instead of `claim.timeframe`. |

---

## 4. Reading the Results: Strengths, Root Causes & Prioritized Fixes

### Platform Strengths
1. **Exceptional Safety & Recall (94.3%)**: BrandLens almost never lets a compliance breach pass undetected. 100% of medical claims, prompt injection attempts, and banned terminology were successfully caught.
2. **Zero Adversarial Leakage (Security Precision & Recall = 100.0%)**: Adversarial prompt injection attacks (`syn-38`, `syn-39`) were treated strictly as inert data delimiters and flagged under `security.injection_attempt`.
3. **Disciplined Abstention**: Ungrounded hallucinations were suppressed; only 1 out of 75 findings lacked direct citation and was safely downgraded to `needs_human_check`.

### Root Causes of Weaknesses
1. **Flesch-Kincaid Readability Over-Sensitivity (`a11y.readability`)**:
   - *Code Location*: `src/lib/review/rules.ts:584–600`
   - *Mechanism*: Flags any text with reading grade level $> 10$. In professional skincare marketing, standard terms (e.g. *"dermatological"*, *"formulation"*, *"Centella Asiatica"*, *"sustainability"*) push syllable counts above grade 10 without actually confusing consumers. This single rule accounted for all 4 clean-post false flags (40.0% clean false-flag rate).
2. **Expired Fact Detection Gate in `rules.ts`**:
   - *Code Location*: `src/lib/review/rules.ts:328–330`
   - *Mechanism*: Fact verification is nested inside `if (hasTimeframe || hasNumeric || hasAbsolute)`. Non-numeric expired facts (such as *"Complimentary botanical sample kit with every monsoon order"*) do not contain numbers, timeframes, or absolute words. The engine skips fact matching entirely, resulting in 0% recall (0 of 2 caught) on `fact.expired`.
3. **Rule Classification vs AI Judgement Overlap**:
   - *Code Location*: `src/lib/review/rules.ts:386` vs `src/lib/review/judge.ts`
   - *Mechanism*: Timeframe claims are categorized as `claim.unsupported` because the deterministic rule treats unverified timeframes as unsupported claims. The evaluation rubric expected separate `claim.timeframe` tags.
4. **AI Tone Linter Breadth**:
   - *Code Location*: `src/lib/review/judge.ts:50`
   - *Mechanism*: Gemini flagged 7 tone issues on marketing copy containing mild urgency words, resulting in 0% tone precision against the strict benchmark ground truth.

### Prioritized Fix List for Future Rounds
1. **P0: Fix Expired Fact Gate in `rules.ts`**: Remove the `if (hasTimeframe || hasNumeric || hasAbsolute)` guard around expired fact scanning so all sentences undergo fact matching against retired and expired database rows.
2. **P1: Calibrate Readability Thresholds by Channel**: Increase the Flesch-Kincaid threshold to grade level 12 for scientific/educational blog copy, or exclude botanical multi-syllable glossary terms from syllable counting.
3. **P2: Separate Rule Keys for Timeframes**: Emit `claim.timeframe` explicitly when `timeframeRegex` triggers, and `claim.unsupported` only when clinical claim overlap fails.
4. **P3: Tone Prompt Constraint**: Instruct Gemini to reserve tone findings for aggressive urgency or shame-based tactics rather than conventional marketing calls-to-action.

---

## 5. Round 1 Success Targets vs. Measured Status

| Round 1 Success Target | Target Threshold | Measured Result (Round 2) | Status | Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Target 1: Finding Correctness** | $\ge 80.0\%$ | **56.9%** | ❌ **Not Yet Met** | High recall (94.3%) achieved, but precision is dragged down by readability and tone false alarms. |
| **Target 2: Unsupported Claims Flagged** | $\ge 90.0\%$ | **100.0%** (13/13) | ✅ **Met** | 100% of unsupported and absolute claims caught without exception. |
| **Target 3: Review Round-Trips Reduction** | $<$ Baseline | Protocol documented | ⏳ **Not Measured** | Standardized measurement protocol defined in `docs/USER_TESTING.md`; live sessions pending. |
| **Target 4: Guidelines Revised via Health** | $\ge 2$ | 2 Proposals Generated | ⚠️ **Partly Met** | Proposal generation and approval API built; 2 synthetic proposals seeded in demo; human adoption pending. |
