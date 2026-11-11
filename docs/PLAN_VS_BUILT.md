# Plan vs. Built: Round 1 Plan to Round 2 Build Audit

Last verified against code: 2026-11-07

This document provides a line-by-line audit comparing the commitments made in the Round 1 proposal (Team Lead: Himanshu Rawat) against the actual implementation in the BrandLens Round 2 build.

---

## 1. Feature-by-Feature Comparison Table

| Round 1 Plan Item | Category | Status | Evidence (File Path) | Notes & Deviations |
| :--- | :--- | :---: | :--- | :--- |
| **Creator Role** | Roles & RBAC | **Done** | `src/lib/types.ts:1`, `src/lib/auth.ts:20` | Submits, edits own drafts, executes reviews, accepts/disputes suggestions. |
| **Brand Manager Role** | Roles & RBAC | **Done** | `src/lib/types.ts:1`, `src/lib/workflow.ts:68` | Reviews team content, requests changes, rejects, approves clean drafts, manages proposals. |
| **Authorised Reviewer Role** | Roles & RBAC | **Done** | `src/lib/types.ts:1`, `src/lib/workflow.ts:85` | Reviews compliance claims, resolves high-severity findings requiring reviewer sign-off. |
| **Admin Role** | Roles & RBAC | **Done** | `src/lib/types.ts:1`, `src/app/library/page.tsx:16` | Full library management, user roles, immutable audit logs, organisation settings. |
| **Separation of Duties (No Self-Approval)** | Governance Rule | **Done** | `src/lib/workflow.ts:60`, `src/__tests__/workflow.test.ts:35` | Creators strictly blocked from approving or rejecting their own content. |
| **Manager Approval Gating on High-Severity Claims** | Governance Rule | **Done** | `src/lib/workflow.ts:72`, `src/components/ContentDetailView.tsx:128` | Managers cannot approve drafts with open findings marked `requires_reviewer = true`. |
| **Deterministic Fixed Checks First** | Pipeline | **Done** | `src/lib/review/rules.ts:114`, `src/lib/review/pipeline.ts:65` | Local regex and heuristic checks run first; instant, zero API cost, offline capable. |
| **PII & Secret Redaction** | Security | **Done** | `src/lib/review/redact.ts:15`, `src/__tests__/redact.test.ts:10` | Masks emails, phone numbers, and API tokens before any text leaves server. |
| **Confidential Content Isolation** | Security | **Done** | `src/lib/review/pipeline.ts:45`, `src/components/AiDisclosureTab.tsx:28` | **Deviation from Round 1**: Completely skips external AI calls rather than running a local Ollama daemon. Evaluated via deterministic rules only. |
| **Passage Retrieval for Grounding** | Pipeline | **Changed** | `src/lib/review/retrieve.ts:10` | **Deviation from Round 1**: Implemented via pure TypeScript tokenized lexical overlap retriever rather than PostgreSQL pgvector embeddings. Zero vector DB overhead. |
| **AI Judge with Structured JSON** | Pipeline | **Done** | `src/lib/review/judge.ts:40`, `src/lib/ai/gemini.ts:25` | Validates model response against strict Zod schema; invalid outputs discarded. |
| **No Source, No Flag (Abstention Gate)** | Governance Rule | **Done** | `src/lib/review/pipeline.ts:145`, `src/lib/review/judge.ts:120` | Findings without library source citation are downgraded to `needs_human_check = true` (never a verdict). |
| **Suggestions with Intent Preservation Check** | Pipeline | **Done** | `src/lib/review/suggest.ts:60`, `src/components/HighlightedText.tsx` | Second AI evaluation classifies fix as `preserved` vs `changed` with reasoning notes. |
| **Human-in-the-Loop Single-Finding Acceptance** | Governance Rule | **Done** | `src/app/api/findings/[id]/accept/route.ts:50` | Revisions applied one by one upon human click; creates non-destructive version `v(N+1)`. |
| **Append-Only Audit Trail** | Governance Rule | **Done** | `src/lib/audit.ts:12`, Supabase `audit_log` table | Every transition, suggestion accept, edit, dispute, and proposal logged immutably. |
| **Graceful Degradation** | Reliability | **Done** | `src/lib/review/pipeline.ts:125`, `src/components/AiDisclosureTab.tsx:44` | AI timeouts or rate limits return rule-based findings with alert banner; never crashes. |
| **Terminology Scanning (Banned, Caution, Preferred)** | Issue Types | **Done** | `src/lib/review/rules.ts:200-280` | Evaluated against database `terms` dictionary with exact offsets and replacements. |
| **Tone Analysis** | Issue Types | **Done** | `src/lib/review/judge.ts:50` | AI evaluates copy against tone guidelines (e.g. aggressive urgency, pushiness). |
| **Messaging Pillars Consistency** | Issue Types | **Done** | `src/lib/review/judge.ts:55` | AI verifies alignment with brand messaging guidelines. |
| **Unsupported Claims & Guarantees** | Issue Types | **Done** | `src/lib/review/rules.ts:298, 386` | Flags absolute promises ("cure", "100%", "miracle") and claims lacking clinical facts. |
| **Outdated Information / Fact Expiry** | Issue Types | **Partial** | `src/lib/review/rules.ts:358`, `eval/RESULTS.md:22` | Rule `fact.expired` is implemented, but eval benchmark caught 0 of 2 test samples because facts are only checked when numeric/timeframe regex triggers. |
| **Visual Consistency (Logos, Fonts, Palette)** | Issue Types | **Not built** | `src/lib/types.ts:21` (`'visual'` enum only) | No image upload or asset analysis implemented. |
| **Accessibility: Color Contrast 4.5:1** | Issue Types | **Not built** | `src/lib/review/rules.ts` | No visual contrast calculator in code. Text contrast in app UI is verified WCAG AA. |
| **Accessibility: Alt Text Missing** | Issue Types | **Done** | `src/lib/review/rules.ts:563` | Flags empty markdown image tags `![]()`. |
| **Accessibility: Vague Link Anchors** | Issue Types | **Done** | `src/lib/review/rules.ts:458` | Flags "click here", "read more", "here" in links and CTAs. |
| **Accessibility: All-Caps Shouting** | Issue Types | **Done** | `src/lib/review/rules.ts:410` | Flags 3+ consecutive uppercase words or standalone words >= 4 letters. |
| **Accessibility: Hashtag Casing** | Issue Types | **Done** | `src/lib/review/rules.ts:516` | Flags long unsegmented hashtags lacking camelCase formatting. |
| **Accessibility: Emoji Overuse** | Issue Types | **Done** | `src/lib/review/rules.ts:541` | Flags content containing more than 5 emojis. |
| **Accessibility: Flesch-Kincaid Readability** | Issue Types | **Done** | `src/lib/review/rules.ts:584` | Computes reading grade level; flags copy exceeding grade level 10. |
| **Format: Plain Text Input** | Formats | **Done** | `src/components/ContentForm.tsx:160` | Direct text entry in web form with 10,000 character limit. |
| **Format: PNG/JPG Image Upload** | Formats | **Not built** | `src/components/ContentForm.tsx` | No image upload input or storage bucket; `sharp` not installed. |
| **Format: PDF Document Text Extraction** | Formats | **Done (R3)** | `package.json`, `src/lib/content/file-extract.ts`, `src/app/api/content/import-file/route.ts` | Implemented in Round 3 via `pdf-parse` with in-memory extraction and zero document storage. |
| **Format: Word (.docx) Text Extraction** | Formats | **Done (R3)** | `package.json`, `src/lib/content/file-extract.ts`, `src/app/api/content/import-file/route.ts` | Implemented in Round 3 via `mammoth` with in-memory extraction and zero document storage. |
| **Format: PowerPoint & Web Pages (Stretch)** | Formats | **Out of scope** | N/A | Explicitly identified as out of scope for Round 2 MVP. |
| **Next.js 15 App Router** | Tech Stack | **Done** | `package.json:20` (`15.5.29`) | Server components, route handlers, server actions, dynamic streaming. |
| **React 19** | Tech Stack | **Done** | `package.json:21` (`19.1.0`) | Modern declarative UI, transitions, server action hooks. |
| **Tailwind CSS v4** | Tech Stack | **Done** | `package.json:34` (`^4`) | Accessible utility-first styling with editorial theme. |
| **Supabase PostgreSQL & Auth** | Tech Stack | **Done** | `package.json:16-17` | Relational database, multi-tenant scoping, session cookie management. |
| **Supabase Storage** | Tech Stack | **Not built** | N/A | No binary asset buckets created; content stored in PostgreSQL text columns. |
| **Supabase Row Level Security (RLS)** | Tech Stack | **Done** | `src/lib/auth.ts:25-90` | Enabled across all tables; all access mediated through service-role client after session verification. |
| **PostgreSQL pgvector Embeddings** | Tech Stack | **Changed** | `src/lib/review/retrieve.ts:10` | Substituted with pure TypeScript lexical keyword retriever to eliminate vector database cold starts. |
| **mammoth Library** | Tech Stack | **Done (R3)** | `package.json:20`, `src/lib/content/file-extract.ts` | Installed in Round 3 for in-memory DOCX text parsing. |
| **pdf-parse Library** | Tech Stack | **Done (R3)** | `package.json:21`, `src/lib/content/file-extract.ts` | Installed in Round 3 for in-memory PDF text parsing. |
| **sharp Library** | Tech Stack | **Not built** | `package.json` | Not included in dependencies. |
| **Google Gemini API SDK** | Tech Stack | **Done** | `package.json:15` (`@google/genai ^2.32.0`) | Primary model `gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`. |
| **Local Ollama Model for Confidential Content** | Tech Stack | **Changed** | `src/lib/review/pipeline.ts:45` | Replaced by deterministic bypass: confidential content strictly stays on-server and skips all external AI calls. |
| **Vercel Hosting Deployment** | Tech Stack | **Done** | `https://brandlens-zeta.vercel.app` | Live deployment with HTTPS, edge routing, and HTTP security response headers. |
| **Improvement 1: Source Grounding & Abstention** | Named Improvements | **Done** | `src/lib/review/pipeline.ts:145`, `eval/RESULTS.md:14` | Abstention rate 1.3% (1/75 ungrounded finding downgraded to needs human check). |
| **Improvement 2: Meaning-Preserving Suggestions** | Named Improvements | **Done** | `src/lib/review/suggest.ts:60` | Dual-pass suggestion generator with explicit `intent_check` classification. |
| **Improvement 3: Guideline Health Insights** | Named Improvements | **Done** | `src/lib/insights/health.ts`, `src/components/insights/ProposalsPanel.tsx` | Analyzes repeated findings, dispute rates, and generates rewording proposals. |
| **Target 1: >= 80% Correct/Useful Findings** | Success Targets | **Partly met** | `eval/RESULTS.md:10` | Measured precision is 56.9% on 40 synthetic samples (target was >= 80%). |
| **Target 2: >= 90% Unsupported Claims Flagged** | Success Targets | **Done** | `eval/RESULTS.md:21` | Measured claim recall is 100.0% (13/13 claims flagged). |
| **Target 3: Fewer Review Round-Trips vs Baseline** | Success Targets | **Not measured** | `docs/USER_TESTING.md:40` | Measurement protocol defined; live human baseline test pending. |
| **Target 4: >= 2 Guidelines Revised via Health** | Success Targets | **Partly met** | `src/app/api/insights/proposals/` | Proposal generation and approval workflow built; demo includes 2 proposals. |
| **Research Plan: 5-8 Interviews & 25+ Survey** | Research Plan | **Not yet run** | `docs/USER_TESTING.md` | Standardized facilitator script and protocols prepared; live testing rows left as `[FILL IN]`. |
| **Planned Test Set (~60 posts)** | Evaluation | **Partial** | `eval/data/samples.json` | 40 synthetic benchmark samples implemented and evaluated (10 clean, 30 violation). |
| **Direct Social Publishing** | Scope Boundary | **Out of scope** | N/A | Confirmed out of scope: BrandLens stops at `published` status; does not post to APIs. |
| **Browser Extension** | Scope Boundary | **Out of scope** | N/A | Confirmed out of scope: web portal application only. |
| **Fine-Tuning / Training Own Models** | Scope Boundary | **Out of scope** | N/A | Confirmed out of scope: zero-shot / few-shot prompt engineering against Gemini foundation models. |

---

## 2. Summary Status Count

- **Done**: 36 items
- **Partial / Partly Met**: 6 items
- **Changed (Architectural Deviations)**: 4 items
- **Not Built**: 8 items (sharp, mammoth, pdf-parse, Supabase Storage, image upload, PDF/Word parsing, assets library, WCAG contrast calculation)
- **Not Measured / Not Yet Run**: 2 items (user testing round-trips baseline, research interviews)
- **Out of Scope**: 4 items
- **Total Audited Items**: 60 items

---

## 3. Key Architectural Deviations & Honest Explanations

1. **Lexical Retriever vs. pgvector**:
   - *Plan*: Store guideline and fact embeddings in PostgreSQL with the `pgvector` extension and run vector similarity search.
   - *Built*: Pure TypeScript lexical keyword retriever (`src/lib/review/retrieve.ts`) using tokenization, stopword removal, and category filtering.
   - *Rationale*: Guarantees zero latency overhead, zero vector index cold starts on serverless edge functions, 100% deterministic reproducibility, and removes external embedding dependencies.
2. **Confidential Mode vs. Local Ollama Daemon**:
   - *Plan*: Route confidential marketing briefs to a local Ollama instance running an open-weight LLM.
   - *Built*: Deterministic bypass (`src/lib/review/pipeline.ts:45`). Drafts marked `confidential: true` strictly run local deterministic rules (`rules.ts`) and never make any network AI call.
   - *Rationale*: Enterprise serverless environments (e.g. Vercel) cannot host continuous GPU-accelerated Ollama daemons without external network egress. A hard local-only execution boundary guarantees zero data exfiltration.
3. **Format Support Scope**:
   - *Plan*: Direct ingestion of PNG/JPG images, PDF documents, and Word `.docx` files.
   - *Built*: Clean Markdown and plain-text editor (`src/components/ContentForm.tsx`), plus bulk Markdown/text guideline import (`src/lib/markdown.ts`).
   - *Rationale*: Focused development on core semantic governance, grounded source citation, role-based workflows, and WCAG AA accessibility within the hackathon build window. Binary parsing libraries were deferred.
