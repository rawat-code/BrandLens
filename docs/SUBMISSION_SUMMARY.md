# BrandLens: Hackathon Submission Summary

This document contains all key project information and portal fields required for the Inkloom AI Hackathon (Round 2) submission.

---

## 1. Product Overview

- **Product Name**: BrandLens
- **Tagline**: Pre-publication brand governance for your organisation.
- **One-Sentence Elevator Pitch**: BrandLens is a pre-publication brand-governance platform that enforces organizational voice, terminology, and legal claims through grounded, citation-backed AI reviews while keeping humans strictly in control of approvals and edits.
- **Core Principle**: *AI suggests, humans decide. Never auto-approve, never auto-publish, never auto-rewrite.*

---

## 2. 100-Word Summary

BrandLens protects brand integrity by reviewing marketing copy before publication against an organization's library of guidelines, approved facts, and banned terminology. Powered by a hybrid deterministic and grounded Gemini AI engine, every flag must cite an exact library quote ("No source, no flag"), accompanied by intent-preserving suggestions. With role-based approval gating, creators cannot approve their own work, and managers cannot bypass high-severity compliance flags without reviewer sign-off. Featuring zero-exposure confidentiality guards, PII redaction, word-level diffs, and an immutable audit log, BrandLens enables fast, collaborative, and legally compliant publishing across distributed teams.

---

## 3. Problem, Solution, and Human-in-the-Loop Workflow

### The Problem
Marketing teams and creators move fast across social, blog, and email channels. Brand voice guidelines, banned medical/cosmetic claims, and expired promotional facts frequently slip through manual reviews. Traditional AI tools either hallucinate policy violations without citations or unsafely auto-rewrite copy, breaking author intent and risking legal liability.

### The Solution
BrandLens combines deterministic rule scanning (regex, exact phrase matching, accessibility linters) with grounded Gemini AI review. Every issue is linked directly to a guideline, term, or clinical fact in the organization library. If an issue cannot be grounded, it is explicitly flagged as "Needs human check", never presented as a verdict.

### The Human-in-the-Loop Workflow
```
[Creator Drafts Content]
        │
        ▼
[Run Review] ──► (Local Rules + PII Redaction + Grounded Gemini AI)
        │
        ▼
[Review Findings] ──► (No Source, No Flag; Intent Preservation Badges)
        │
        ├──► [Creator Accepts / Edits Fixes] ──► Creates Non-Destructive v(N+1)
        ├──► [Creator Disputes Fix with Reason]
        │
        ▼
[Submit for Approval] ──► State: in_review (Creator CANNOT self-approve)
        │
        ▼
[Manager / Reviewer Review] ──► (Manager blocked if requires_reviewer flag is open)
        │
        ├──► Request Changes (Requires mandatory comment)
        ├──► Reject (Requires mandatory comment)
        └──► Approve
                │
                ▼
        [Creator Publishes Approved Draft]
```

---

## 4. Three Promised Improvements Over Round 1

| # | Improvement | Description | Repository Location | App Location |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Brand-Agnostic Architecture (Fictional Demo Data)** | Removed all hardcoded brand assumptions. "Verdant Skin" exists purely as seeded database data. Added `/settings` with organization rename and typed "Start Fresh" reset modal, plus instant markdown/text guideline import. | [`src/app/settings/page.tsx`](file:///home/kira/Downloads/BrandLens/src/app/settings/page.tsx), [`src/components/ImportGuidelinesModal.tsx`](file:///home/kira/Downloads/BrandLens/src/components/ImportGuidelinesModal.tsx) | [`/settings`](https://brandlens-zeta.vercel.app/settings), [`/library`](https://brandlens-zeta.vercel.app/library) |
| **2** | **Guideline Clarity Feedback Loop** | Automated intelligence on guideline health. Tracks repeated creator violations, disputes, and overrides. Generates AI-assisted guideline clarification proposals that Admins can approve or dismiss. | [`src/lib/insights/aggregation.ts`](file:///home/kira/Downloads/BrandLens/src/lib/insights/aggregation.ts), [`src/app/api/insights/propose/route.ts`](file:///home/kira/Downloads/BrandLens/src/app/api/insights/propose/route.ts) | [`/insights`](https://brandlens-zeta.vercel.app/insights) |
| **3** | **Full Accessibility & Compliance Audit** | WCAG 2.1 AA compliant UI: semantic HTML, visible keyboard focus rings, non-color-only statuses, aria labels on all interactive controls, and automated content a11y linters (all-caps shouting, vague link text). | [`src/lib/review/rules.ts`](file:///home/kira/Downloads/BrandLens/src/lib/review/rules.ts), [`src/components/FindingsGroup.tsx`](file:///home/kira/Downloads/BrandLens/src/components/FindingsGroup.tsx) | Throughout all views & `/content/[id]` |

---

## 5. Technical Architecture & Tech Stack Choices

- **Next.js 15 (App Router, React 19, TypeScript)**: Server components for zero-bundle-size rendering of heavy libraries, secure server actions, and dynamic route streaming.
- **Tailwind CSS**: Utility-first accessible design system with responsive layouts and WCAG AA contrast.
- **Supabase (PostgreSQL + Auth + Row Level Security)**: Enterprise-grade relational data modeling with strict organization isolation (`org_id`), role-based access control, and immutable audit logs.
- **Google GenAI SDK (`@google/genai`)**: Native Gemini API integration featuring structured JSON schema validation, low-latency Flash models, and retry/timeout resilience.
- **Zod**: Runtime schema validation on every API request, database payload, and AI completion.
- **Vitest**: Fast in-memory unit and integration test runner executing 111 tests in under 2 seconds.

---

## 6. Required Services & Accounts (All Free Tier)

1. **Vercel**: Hosts the Next.js 15 application (Hobby Free Tier).
2. **Supabase**: Managed PostgreSQL database, authentication, and RLS policies (Free Tier).
3. **Google AI Studio / Gemini API**: Generative AI review, suggestions, and intent analysis (Free Tier / Pay-as-you-go).

No paid dependencies, proprietary vector databases, or complex third-party infrastructure required.

---

## 7. AI Disclosure & Model Telemetry

- **Production AI Models**:
  - Primary Model: `gemini-3.5-flash-lite` (Configurable via `GEMINI_MODEL`)
  - Fallback Model: `gemini-2.5-flash` (Configurable via `GEMINI_FALLBACK_MODEL`)
- **Use of AI in BrandLens**:
  - Semantic guideline compliance judgment
  - Contextual replacement suggestions
  - Intent preservation verification (`meaning_preserved` / `meaning_altered`)
  - Guideline wording clarification proposals in `/insights`
- **Development Tooling**:
  - Developed with AI-assisted pair programming using **Google Antigravity**.
  - Internal Antigravity Model(s): `[TEAM TO FILL]` *(e.g. Gemini 2.5 Pro / Claude 3.7 Sonnet)*

---

## 8. Security & Privacy Guardrails

1. **Client-Side Redaction**: Automated regex redaction of email addresses, phone numbers, and API tokens before transmission to AI services.
2. **Confidentiality Guard**: Drafts flagged as confidential bypass external AI APIs entirely; only deterministic local rules execute.
3. **Prompt Injection Defense**: Submissions are treated strictly as DATA enclosed in XML delimiters (`<content>...</content>`). System instructions explicitly command the model to ignore instructions within the text.
4. **Append-Only Audit Log**: Every state change, review execution, finding decision, and clarification proposal is written to an immutable `audit_log` table.
5. **Zero Anon DB Access**: Row Level Security (RLS) is enabled on all tables with zero public policies. All queries route through server actions/endpoints using verified session roles.

---

## 9. Submission Links

- **Live Application URL**: [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app)
- **GitHub Repository**: [TEAM TO FILL - make public before submitting] *(e.g. https://github.com/rawat-code/BrandLens)*
- **2-Minute Demo Video**: [TEAM TO FILL] *(e.g. Loom or YouTube URL)*

---

## 10. Demo Credentials for Testing

All demo accounts belong to the fictional demonstration organization **"Verdant Skin (demo)"** and share the demo password. The login page also features one-click demo login buttons.

- **Password**: `verdant12110` (or as configured in `.env` via `DEMO_PASSWORD`)

| Role | Email | Best For Testing |
| :--- | :--- | :--- |
| **Creator** | `creator@verdant.demo` | Drafting content, running reviews, accepting suggestions, submitting for approval. (Blocked from self-approving). |
| **Manager** | `manager@verdant.demo` | Team dashboard, approving/requesting changes, viewing `/insights`. (Blocked on open high-severity findings). |
| **Reviewer** | `reviewer@verdant.demo` | Senior compliance review, resolving high-severity flags with `requires_reviewer = true`. |
| **Admin** | `admin@verdant.demo` | Library management (guidelines, facts, terms), audit log inspection, workspace rename, and "Start Fresh". |
