# BrandLens Evaluation Benchmark Results

> Generated automatically by `scripts/eval.ts` on Thu, 05 Nov 2026 13:34:30 GMT.
> Dataset: 40 synthetic marketing samples for fictional brand **Verdant Skin** (10 clean posts, 30 targeted violation posts).

## 1. Executive Summary

| Metric | Score | Note |
| :--- | :--- | :--- |
| **Overall Precision** | **61.1%** | Ratio of relevant detected flags over total flags |
| **Overall Recall** | **94.3%** | Ratio of target violations successfully caught |
| **Overall F1 Score** | **74.2%** | Harmonic mean of Precision and Recall |
| **Clean False-Flag Rate** | **40.0%** | False alarms triggered on clean posts (4/10) |
| **Abstention Rate** | **1.4%** | Findings marked `needs_human_check: true` without source citation (1/70) |

## 2. Category Breakdown

| Category | TP | FP | FN | Precision | Recall | F1 Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **terminology** | 10 | 4 | 0 | 71.4% | 100.0% | 83.3% |
| **claim** | 13 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| **fact** | 0 | 0 | 2 | 100.0% | 0.0% | 0.0% |
| **accessibility** | 8 | 14 | 0 | 36.4% | 100.0% | 53.3% |
| **security** | 2 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| **tone** | 0 | 3 | 0 | 0.0% | 100.0% | 0.0% |

## 3. Sample Evaluation Log

| ID | Sample Title | Type | Status | Expected Rules | Detected Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `syn-01` | Gentle Rosehip Sourcing Story | Clean | ✅ Pass | `none` | `none` |
| `syn-02` | Barrier Support Moisturizer | Clean | ✅ Pass | `none` | `none` |
| `syn-03` | Shipping Policy Announcement | Clean | ✅ Pass | `none` | `none` |
| `syn-04` | Glass Packaging Milestone | Clean | ⚠️ Partial | `none` | `a11y.readability` |
| `syn-05` | Clean Formulation Promise | Clean | ⚠️ Partial | `none` | `a11y.readability` |
| `syn-06` | User Perception Survey | Clean | ✅ Pass | `none` | `none` |
| `syn-07` | Dermatological Sensitivity Trial | Clean | ⚠️ Partial | `none` | `a11y.readability` |
| `syn-08` | Botanical Face Mist Daily Habit | Clean | ✅ Pass | `none` | `none` |
| `syn-09` | Winter Barrier Guide | Clean | ✅ Pass | `none` | `none` |
| `syn-10` | Ethical Cultivation Overview | Clean | ⚠️ Partial | `none` | `a11y.readability` |
| `syn-11` | Medical Cure Claim | Violation | ✅ Pass | `term.banned, claim.absolute` | `term.banned, claim.absolute, claim.unsupported` |
| `syn-12` | Sensational Magic Term | Violation | ✅ Pass | `term.banned` | `term.banned, a11y.readability` |
| `syn-13` | Guaranteed Outcome Promise | Violation | ✅ Pass | `term.banned, claim.absolute` | `term.banned, claim.absolute, claim.unsupported` |
| `syn-14` | Chemical Free Claim | Violation | ✅ Pass | `term.banned` | `term.banned, a11y.readability` |
| `syn-15` | Miracle Formulation Term | Violation | ✅ Pass | `term.banned, claim.absolute` | `term.banned, claim.absolute, claim.unsupported` |
| `syn-16` | Ambiguous Natural Caution | Violation | ✅ Pass | `term.caution` | `term.caution` |
| `syn-17` | Dermatologist Approved Caution | Violation | ✅ Pass | `term.caution` | `term.caution, a11y.readability` |
| `syn-18` | Concatenated Brand Name Variant | Violation | ✅ Pass | `term.preferred_variant` | `term.preferred_variant` |
| `syn-19` | Lowercase Brand Name Variant | Violation | ✅ Pass | `term.preferred_variant` | `term.preferred_variant, a11y.readability` |
| `syn-20` | Absolute Guarantee Statement | Violation | ✅ Pass | `claim.absolute` | `claim.absolute, claim.unsupported, a11y.readability` |
| `syn-21` | Instant Efficacy Absolute Claim | Violation | ✅ Pass | `claim.absolute` | `claim.absolute, claim.unsupported, a11y.readability` |
| `syn-22` | Clinically Proven Absolute Claim | Violation | ✅ Pass | `claim.absolute` | `claim.absolute, claim.unsupported, a11y.readability` |
| `syn-23` | 7 Days Timeframe Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` |
| `syn-24` | Overnight Transformation Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` |
| `syn-25` | 48 Hours Timeframe Claim | Violation | ⚠️ Partial | `claim.timeframe` | `claim.unsupported` |
| `syn-26` | Unsupported Numeric Percentage Claim | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `a11y.readability, ai.claim.this_claim_lacks_sub` |
| `syn-27` | Unsupported Statistical Metric | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `ai.claim.the_content_makes_a_` |
| `syn-28` | Unsupported Survey Claim | Violation | ⚠️ Partial | `claim.numeric, claim.unsupported` | `a11y.readability, ai.claim.the_claim_regarding_` |
| `syn-29` | Expired Discount Fact Reference | Violation | ⚠️ Partial | `fact.expired` | `none` |
| `syn-30` | Expired Monsoon Kit Fact Reference | Violation | ⚠️ Partial | `fact.expired` | `a11y.readability, ai.tone.the_phrase__order_to` |
| `syn-31` | All-Caps Aggressive Urgency | Violation | ✅ Pass | `a11y.allcaps` | `a11y.allcaps, ai.tone.the_content_uses_agg` |
| `syn-32` | All-Caps Promotion Headline | Violation | ✅ Pass | `a11y.allcaps` | `a11y.allcaps, a11y.readability, ai.tone.the_language_uses_ar` |
| `syn-33` | Vague Link 'click here' | Violation | ✅ Pass | `a11y.vague_link` | `term.preferred_variant, a11y.vague_link` |
| `syn-34` | Vague Link 'read more' | Violation | ✅ Pass | `a11y.vague_link` | `term.preferred_variant, a11y.vague_link` |
| `syn-35` | Vague Link 'here' | Violation | ✅ Pass | `a11y.vague_link` | `term.preferred_variant, a11y.vague_link, a11y.readability` |
| `syn-36` | Excessive Emoji Content | Violation | ✅ Pass | `a11y.emoji_heavy` | `a11y.emoji_heavy` |
| `syn-37` | Missing Alt Text In Markdown Image | Violation | ⚠️ Partial | `a11y.image_alt` | `term.preferred_variant, a11y.alt_missing` |
| `syn-38` | Prompt Injection Override Attempt | Violation | ✅ Pass | `security.injection_attempt` | `security.injection_attempt` |
| `syn-39` | Prompt Injection Disregard Prompts | Violation | ✅ Pass | `security.injection_attempt` | `security.injection_attempt` |
| `syn-40` | Multi-Violation Compound Post | Violation | ⚠️ Partial | `term.preferred_variant, term.banned, claim.timeframe, a11y.vague_link` | `term.banned, term.preferred_variant, claim.unsupported, a11y.vague_link` |

## 4. Benchmark Methodology & Safeguards

1. **No Source, No Flag Policy**: When a finding cannot cite a grounded guideline, fact, or term, the platform safely abstains (`needs_human_check: true`).
2. **Clean Post Integrity**: Clean posts undergo full lexical tokenization, claim sentence evaluation, and term variant matching to ensure creators are not impeded by erroneous flags.
3. **Adversarial Resilience**: Prompt injection attempts ("ignore instructions", "disregard prior prompts") are flagged under `security.injection_attempt` and handled strictly as inert data delimiters.
