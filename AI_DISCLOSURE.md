# AI Disclosure & Transparency Statement

Last verified against code: 2026-11-07

This document discloses how and where artificial intelligence is utilized within the **BrandLens** platform, throughout its engineering and build process, in its planning documentation, and regarding reused external materials.

---

## Part A: AI Inside the Product

### 1. Foundation Models Used
- **Primary Review Engine**: `gemini-3.5-flash-lite` (via `@google/genai` SDK, configurable via `GEMINI_MODEL`).
- **Failover / Fallback Engine**: `gemini-3.1-flash-lite` (via `@google/genai` SDK, configurable via `GEMINI_FALLBACK_MODEL`).

### 2. Capabilities Powered by AI
1. **Review Judgement (`src/lib/review/judge.ts`)**:
   - Compares content copy against candidate guidelines and verified facts.
   - Evaluates subjective brand nuances: tone compliance (e.g. aggressive urgency, medical claims), messaging alignment, and subtle regulatory assertions.
   - Enforces structured JSON output validated against strict Zod schemas (`src/lib/validation.ts`).
2. **Suggestions & Intent Preservation (`src/lib/review/suggest.ts`)**:
   - Generates minimal, non-destructive replacement copy for flagged spans.
   - Conducts a secondary evaluation pass checking whether suggested edits preserve author voice and communicative intent (`intent_check: 'preserved' | 'changed'`).
3. **Guideline Clarification Synthesis (`src/app/api/insights/proposals/generate/route.ts`)**:
   - Synthesizes repeated creator dispute reasons to propose clearer policy phrasing for administrator and manager review in `/insights`.

### 3. What Text Leaves the Server & Redaction Controls
- **Strict In-Flight Redaction**: Before any text is transmitted to Google Gemini, `src/lib/review/redact.ts` strips email addresses, phone numbers, and API tokens.
- **Data Delimiters**: Submissions are treated strictly as DATA, wrapped in `<content>...</content>` delimiters with prompt instructions to ignore instructions inside.
- **Confidential Exemption**: Content marked `confidential: true` strictly bypasses all external AI calls. Only local deterministic rules execute.

### 4. What AI Can Never Do in BrandLens
- **AI Never Approves**: The model cannot transition content status to `approved`.
- **AI Never Publishes**: The model has no access to publishing actions.
- **AI Never Auto-Rewrites**: Suggestions are applied only when a human user clicks **Accept**, creating an immutable version snapshot `v(N+1)`.
- **AI Never Authoritatively Flags Without Grounding**: Potential findings lacking source citations in the library are automatically downgraded to `needs_human_check = true` ("Needs human check").

### 5. User-Facing Transparency Telemetry
- Every reviewed draft features an **AI Disclosure** tab (`src/components/AiDisclosureTab.tsx`) rendering:
  - Exact model identifier used (`gemini-3.5-flash-lite` or fallback).
  - PII redaction count.
  - Count breakdown of deterministic rule findings vs AI findings.
  - Verbatim preview of redacted data transmitted to the model.
  - Policy skip reasons when AI was bypassed (confidential content, missing keys, or timeouts).

---
---

## Part B: AI Used to Build the Product

BrandLens was developed with the assistance of **Google Antigravity**, an agentic AI coding assistant. Himanshu Rawat directed the work, supplied the product rules and prompts, and ran the tests and deployments.

- **Coding Assistant Tool**: Google Antigravity
- **Exact Model(s) Used Inside Antigravity**: Gemini 3.8 Flash
- **Skills and Tools Added to Workspace**: An Onlook skill (`.agents/skills/onlook`), a visual editing tool for React and Tailwind projects.
- **Components Generated or Assisted by AI**:
  1. *Application Code*: Assisted in scaffolding Next.js 15 App Router route handlers, server actions, client view components, and pure review engine modules (`rules.ts`, `judge.ts`, `suggest.ts`, `redact.ts`, `retrieve.ts`, `pipeline.ts`).
  2. *Automated Test Suites*: Generated initial unit and integration tests across 21 test files (115 tests in Vitest).
  3. *Evaluation Benchmark*: Assisted in authoring synthetic test samples (`eval/data/samples.json`) and evaluation harness (`scripts/eval.ts`).
  4. *Documentation*: Drafted baseline technical documentation, API specifications, and architectural diagrams.
- **Human Oversight & Review Process**:
  - Every line of code, database query, and security policy was reviewed, refined, and validated by the team lead (Himanshu Rawat).
  - Architectural decisions, workflow state machine guards, RLS boundaries, and evaluation metrics were tested and confirmed locally and on the live Vercel deployment.

---

## Part C: AI Used for Planning Documents

- **Claude (Anthropic)**: Used to help plan the project and to draft the Round 1 plan and Round 2 update documents, the build prompts given to Antigravity, and design mockups. The team reviewed these and is responsible for their content.
- All commitments and architectural goals in Round 1 served as the baseline for the build audit.

---

## Part D: Reused Material, Templates & Boilerplate

A comprehensive catalog of third-party templates and libraries is provided in [`docs/SERVICES.md`](file:///home/kira/Downloads/BrandLens/docs/SERVICES.md):
- **Scaffolding Template**: Official `create-next-app` starter template (Next.js 15 App Router with TypeScript and Tailwind CSS; initial commit `5ab6adc` on 2026-11-04). All application code was written during the hackathon.
- **Component Libraries**: **Zero** third-party component libraries (e.g. shadcn, MUI, Chakra) were used. All UI components, buttons, dialogs, badges, and redline diff viewers were built custom for BrandLens.
- **External Services**: Supabase (PostgreSQL + Auth) and Google Gemini API (`@google/genai`).
