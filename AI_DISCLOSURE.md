# AI Disclosure

BrandLens is a pre-publication brand-governance review platform built for the Inkloom AI hackathon (Round 2 build). This document discloses how and where artificial intelligence is utilized within the platform and throughout its engineering process.

---

## 1. AI Usage Within the Product

BrandLens uses Google Gemini strictly to augment human decision-makers. In accordance with the non-negotiable product rules, **AI never approves, publishes, or rewrites content autonomously**. Human editors and compliance officers retain sole authority over all content modifications and approvals.

AI is utilized in the following specific product capabilities:

1. **Review Judgement (`src/lib/review/judge.ts`)**:
   - Compares redacted content submissions against the organisation's approved guidelines, facts, and terminology dictionary.
   - Evaluates whether nuanced copy complies with brand tone, messaging pillars, and claims policies.
   - Generates confidence scores and requires explicit citation of library source rules.

2. **Fix Suggestions (`src/lib/review/suggest.ts`)**:
   - Generates non-destructive revision suggestions for identified issues while preserving the creator's voice and intent.
   - Requires individual, manual human acceptance to apply any suggested modification.

3. **Intent Verification Check (`intent_check`)**:
   - Verifies whether suggested edits alter the core commercial or communicative message intended by the creator.

4. **Guideline Clarification Proposals (`guideline_proposals`)**:
   - Synthesizes recurring findings to propose guideline clarifications or amendments for human administrators to review.

### Guardrails & Safety Constraints:
- **Data vs. Instructions**: Content under review is treated strictly as DATA, wrapped in strict delimiters in prompts to prevent prompt injection.
- **Data Privacy & Redaction**: PII (emails, phone numbers) and API keys/secrets are stripped prior to AI ingestion.
- **Confidentiality Gate**: Any content flagged as confidential completely bypasses the external AI service, running only local deterministic rule checks.
- **Graceful Degradation**: If AI calls fail or timeout, the platform falls back to deterministic rule-based checks with an explicit user alert banner.

---

## 2. AI-Assisted Development Disclosure

BrandLens was developed using **Google Antigravity**, an agentic AI coding assistant.

- **Development Assistant**: Google Antigravity
- **Model(s) Used Inside Antigravity**: gemini 3.8 flash 

