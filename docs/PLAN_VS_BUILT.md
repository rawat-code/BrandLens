# Plan vs. Built: BrandLens Feature Audit

This document provides an honest comparison between the planned features (from AGENTS.md, Round 1 specification, and product rules) and what is currently implemented in the BrandLens codebase.

| Feature Area | Planned Capability | Status | Implementation File(s) | Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Source Library** | Guidelines management (add, edit, category, tags) | **Done** | `src/app/library/page.tsx`, `src/components/LibraryManager.tsx`, `src/app/api/library/guidelines/` | Full CRUD with RBAC (Admin/Manager edit, others read-only). |
| **Source Library** | Facts database with expiration dates & status | **Done** | `src/components/LibraryManager.tsx`, `src/app/api/library/facts/` | Supports active/expired states, warning badges for expired facts. |
| **Source Library** | Terminology dictionary (preferred & banned terms) | **Done** | `src/components/LibraryManager.tsx`, `src/app/api/library/terms/` | Case-insensitive matching, category tags. |
| **Source Library** | Bulk markdown/text guideline import | **Done** | `src/lib/library/markdown-parser.ts`, `src/app/api/library/guidelines/import/route.ts` | Upload `.md`/`.txt` or paste; splits by headings, previews, and imports. |
| **Content Review** | Deterministic fixed rules engine | **Done** | `src/lib/review/rules.ts` | Banned terms, all-caps, absolute claims, vague links, expired facts. |
| **Content Review** | Redaction engine for PII and secrets | **Done** | `src/lib/review/redact.ts` | Regex masking for emails, phone numbers, API keys prior to AI calls. |
| **Content Review** | Confidential content gate | **Done** | `src/lib/review/pipeline.ts`, `src/app/content/new/page.tsx` | Completely bypasses Gemini when `confidential: true`. Deterministic rules only. |
| **Content Review** | Grounded AI review with source citations | **Done** | `src/lib/review/judge.ts`, `src/lib/review/retrieve.ts`, `src/lib/ai/gemini.ts` | AI findings must cite an exact library item. Uncited items get `needs_human_check = true`. |
| **Content Review** | Suggestions with Intent Check | **Done** | `src/lib/review/suggest.ts` | AI generates replacement copy and labels `intent_check` ('preserved' vs 'changed'). |
| **Content Review** | Human-in-the-loop decision making | **Done** | `src/app/api/findings/[id]/accept/route.ts`, `dispute/route.ts`, `dismiss/route.ts` | Suggestions applied one-by-one by user; dispute/dismiss require reason. |
| **Content Review** | Graceful AI degradation | **Done** | `src/lib/review/pipeline.ts`, `src/components/ContentDetailView.tsx` | AI timeout/failure returns deterministic rules + UI alert banner. |
| **Approval Workflow** | Role-based state machine | **Done** | `src/lib/workflow.ts`, `src/app/api/content/[id]/transition/route.ts` | States: `draft`, `ai_reviewed`, `needs_changes`, `in_review`, `approved`, `rejected`, `published`. |
| **Approval Workflow** | Self-approval prevention | **Done** | `src/lib/workflow.ts`, `src/app/api/content/[id]/transition/route.ts` | Creators strictly blocked from approving or rejecting their own content. |
| **Approval Workflow** | Reviewer escalation requirement | **Done** | `src/lib/workflow.ts`, `src/app/api/content/[id]/transition/route.ts` | Managers cannot approve if high-severity `requires_reviewer` finding is open. |
| **Audit & History** | Append-only audit trail | **Done** | `src/lib/audit.ts`, `src/app/api/content/[id]/activity/route.ts` | Every transition, suggestion accept, edit, and proposal logs an audit row. |
| **Audit & History** | Version history & diffing | **Done** | `src/lib/diff.ts`, `src/components/ContentDetailView.tsx` | Full character/word diff between versions; tracks creator & timestamp. |
| **Collaboration** | Comment threads on content | **Done** | `src/app/api/content/[id]/comments/route.ts`, `src/components/ContentDetailView.tsx` | Threaded comments, role badges, timestamping. |
| **Insights & Governance**| Governance insights dashboard | **Done** | `src/app/insights/page.tsx`, `src/components/insights/InsightsClientView.tsx` | Repeated findings, stale fact alerts, guideline health scoring. |
| **Insights & Governance**| Guideline clarification proposals | **Done** | `src/lib/insights/health.ts`, `src/app/api/insights/proposals/` | Proposes revisions for unclear guidelines; manager/admin approval flow. |
| **Insights & Governance**| Demo history seeding | **Done** | `src/app/api/insights/seed-demo/route.ts` | Generates realistic governance activity labeled as synthetic. |
| **Security & Privacy** | Prompt injection defenses | **Done** | `src/lib/review/judge.ts`, `src/lib/review/suggest.ts` | Content wrapped in delimiters, system prompts enforce content as DATA only. |
| **Security & Privacy** | Multi-tenant org isolation (RLS) | **Done** | `src/lib/auth.ts`, Supabase schema | Queries filter by `org_id`; `requireRole` checks every endpoint. |
| **Settings & Admin** | Dynamic organization name | **Done** | `src/lib/auth.ts`, `src/app/settings/page.tsx`, `src/app/api/settings/org/route.ts` | Org name rendered across headers, sidebar, dashboards, and prompts. |
| **Settings & Admin** | Reset / Start fresh danger zone | **Done** | `src/app/settings/page.tsx`, `src/app/api/settings/start-fresh/route.ts` | Admin-only typed confirmation to wipe content/library; preserves audit log. |
| **AI Transparency** | AI Disclosure tab on content | **Done** | `src/components/ContentDetailView.tsx` | Plain language breakdown of AI models used, parameters sent, redaction, and skip reasons. |
| **AI Transparency** | Repository AI Disclosure document | **Done** | `AI_DISCLOSURE.md` | Details AI usage in product and engineering; leaves model line for team. |

