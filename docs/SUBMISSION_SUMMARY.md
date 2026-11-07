# BrandLens: Inkloom AI Hackathon Round 2 Submission Pack

Last verified against code: 2026-11-07

This document compiles all official portal fields, summaries, walkthrough routes, requirement evidence maps, and scoring guides for the **BrandLens** Round 2 build submission.

---

## 1. Product Metadata & Fast Links

- **Product Name**: BrandLens
- **Tagline**: Pre-publication brand governance for your organisation.
- **One-Sentence Elevator Pitch**: BrandLens is a pre-publication brand-governance review platform that enforces organizational voice, terminology, and legal claims through grounded, citation-backed AI reviews while keeping humans strictly in control of approvals and edits.
- **Core Philosophy**: *AI suggests, humans decide. Never auto-approve, never auto-publish, never auto-rewrite.*
- **Live Deployment URL**: [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app)
- **Public GitHub Repository**: [https://github.com/rawat-code/BrandLens](https://github.com/rawat-code/BrandLens)
- **Demo Video Walkthrough**: `[FILL IN: 2-minute Loom/YouTube demo video link]`
- **Demo Workspace**: `Verdant Skin (demo)` (Fictional botanical skincare brand used for demo data)
- **Demo Credentials**: Password is provided in the submission form. The login screen also features one-click demo role buttons.

---

## 2. 100-Word Portal Summary

BrandLens protects brand integrity by reviewing marketing copy before publication against an organization's library of guidelines, approved clinical facts, and banned terminology. Powered by a hybrid deterministic and grounded Gemini AI review engine, every flag must cite an exact library quote ("No source, no flag"), accompanied by intent-preserving suggestions. With role-based approval gating, creators cannot approve their own work, and managers cannot bypass high-severity compliance flags without reviewer sign-off. Featuring zero-exposure confidentiality guards, PII redaction, word-level diffs, and an immutable audit log, BrandLens enables fast, collaborative, and legally compliant publishing across distributed teams.

---

## 3. 250-Word System Description

Marketing teams move rapidly across social, email, and blog channels, creating constant risk that unapproved health claims, banned words, or expired promotional facts slip into production. Traditional AI tools either hallucinate policy violations without citations or unsafely auto-rewrite text, breaking author intent and risking legal liability.

BrandLens solves this with a human-in-the-loop review architecture. First, local deterministic rules scan copy for banned terms, absolute guarantees, and accessibility issues. Second, non-confidential text undergoes automatic PII redaction before a tokenized lexical retriever selects relevant guidelines for the Google Gemini AI judge. Under our "No Source, No Flag" policy, any issue lacking direct library grounding is downgraded to "Needs human check" rather than asserted as a verdict.

Third, our dual-pass suggestion engine generates non-destructive corrections and verifies whether the edit preserves the creator's communicative intent, surfacing green "Meaning preserved" or amber "Meaning may have changed" badges. Suggestions are applied only when a human user clicks Accept, generating an immutable new version with word-level diff tracking.

Fourth, strict separation of duties prevents creators from approving their own work, while managers are blocked from approving drafts with open high-severity findings until an authorized reviewer signs off. Confidential content completely bypasses external AI calls, running deterministic rules locally. Finally, our insights engine scores guideline ambiguity from creator disputes and proposes AI-assisted wording revisions for administrator approval, turning reactive compliance into a continuous improvement loop.

---

## 4. Five-Line "How to Test It" Route

1. Open [https://brandlens-zeta.vercel.app/login](https://brandlens-zeta.vercel.app/login) in an incognito window and click the **Creator** one-click demo button.
2. Open **Showcase A: Miracle Serum Campaign (Draft)**; inspect the 10 margin notes with exact source citations, suggestion diffs, and the amber `Meaning may have changed` intent badge on Note 1.
3. Click **Accept** on Note 1 to generate `v2` non-destructively; click **Submit for approval** to transition the draft to `in_review`.
4. Sign out, click **Manager**, open **Showcase B: Clinical Skin Barrier Spotlight (In Review)**, and verify that the **Approve** button is disabled with the notice `Open high-severity findings require Reviewer role`.
5. Navigate to `/insights` to inspect the 30-day cited findings metrics, rule category distribution bars, and AI-assisted guideline clarification proposals.

---

## 5. Round 2 Organiser Requirements Evidence Map

| Round 2 Requirement | Status | Where to Verify | Evidence in Code / Live URL |
| :--- | :---: | :--- | :--- |
| **1. Functional product or demonstrable MVP** | **Verified** | Live web app & repository test suite | [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app); 115 passing tests (`npm test`). |
| **2. Public or judge-accessible repository** | **Verified** | GitHub source repository | [https://github.com/rawat-code/BrandLens](https://github.com/rawat-code/BrandLens). |
| **3. Deployed link or functional demonstration** | **Verified** | Production Vercel deployment | [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app); live and operational with HTTPS. |
| **4. Architecture & technical decisions** | **Verified** | Technical documentation | [`docs/ARCHITECTURE.md`](file:///home/kira/Downloads/BrandLens/docs/ARCHITECTURE.md); request flows, state machine, and decision table. |
| **5. APIs, models, datasets, dependencies, templates** | **Verified** | Services directory | [`docs/SERVICES.md`](file:///home/kira/Downloads/BrandLens/docs/SERVICES.md); exact models, licenses, and data egress audit. |
| **6. User testing or structured feedback** | **Template** | User testing protocol & script | [`docs/USER_TESTING.md`](file:///home/kira/Downloads/BrandLens/docs/USER_TESTING.md); script, tasks, debrief questions (results left as `[FILL IN]`). |
| **7. Statement of team member contributions** | **Verified** | Contributions statement | [`docs/CONTRIBUTIONS.md`](file:///home/kira/Downloads/BrandLens/docs/CONTRIBUTIONS.md); verified git log counts (81 commits by Himanshu Rawat). |

---

## 6. Round 2 Judging Criteria Alignment Map

| Scoring Area (Points) | Focus | Primary Evidence in BrandLens | Where Judges Can Test It |
| :--- | :---: | :--- | :--- |
| **Core Workflow End to End (30)** | Complete submission $\rightarrow$ review $\rightarrow$ revision $\rightarrow$ approval $\rightarrow$ publish cycle. | Pure review engine (`src/lib/review/`), state machine (`src/lib/workflow.ts`), version diffs (`src/lib/diff.ts`), and immutable audit log (`src/lib/audit.ts`). | Execute Steps 1–4 of the "How to Test It" route on the live deployment. |
| **Technical Depth & Reliability (25)** | Architectural rigor, multi-tenant RLS, PII redaction, prompt injection defense, graceful degradation. | 115 automated Vitest unit/integration tests (`npm test`), strict Supabase RLS, fallback model failover, zero client secrets, and 10,000 char limits. | Review [`docs/ARCHITECTURE.md`](file:///home/kira/Downloads/BrandLens/docs/ARCHITECTURE.md) and [`docs/SECURITY_PRIVACY.md`](file:///home/kira/Downloads/BrandLens/docs/SECURITY_PRIVACY.md). |
| **Progress Against Plan (20)** | Honesty in deliverables vs Round 1 plan, clear accounting of deviations. | Line-by-line audit in [`docs/PLAN_VS_BUILT.md`](file:///home/kira/Downloads/BrandLens/docs/PLAN_VS_BUILT.md) (36 Done, 6 Partial, 4 Changed, 8 Not Built, 4 Out of Scope). | Audit [`docs/PLAN_VS_BUILT.md`](file:///home/kira/Downloads/BrandLens/docs/PLAN_VS_BUILT.md) and [`KNOWN_ISSUES.md`](file:///home/kira/Downloads/BrandLens/KNOWN_ISSUES.md). |
| **The Three Named Improvements (15)** | Source grounding with abstention, intent preservation verification, guideline health proposals. | Dedicated modules (`judge.ts`, `suggest.ts`, `health.ts`), benchmark metrics (1.3% abstention, 100% claim recall), and `/insights` proposal approval gate. | Review [`docs/IMPROVEMENTS.md`](file:///home/kira/Downloads/BrandLens/docs/IMPROVEMENTS.md) and test `/insights`. |
| **Usability So Far (10)** | Clear editorial layout, visible focus, WCAG AA color contrast, responsive mobile operability. | Custom editorial Redline design, accessible semantic HTML, keyboard operability (Cmd+K palette), non-color-only badges, and responsive viewports. | Inspect screenshots in [`README.md`](file:///home/kira/Downloads/BrandLens/README.md) and test responsive navigation at 390px. |

---

## 7. Submission Checklist for Portal Entry

- [x] **Live URL tested in incognito window**: Verified operational at [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app).
- [x] **Public GitHub repository link**: Verified accessible at [https://github.com/rawat-code/BrandLens](https://github.com/rawat-code/BrandLens).
- [ ] **2-Minute Demo Video**: `[FILL IN: Video URL]` (Team to record and paste prior to submission).
- [x] **Demo Credentials**: User accounts accessible via one-click login buttons; password provided in submission portal form.
- [ ] **Team Member Attribution**: Confirm individual contributor names in [`docs/CONTRIBUTIONS.md`](file:///home/kira/Downloads/BrandLens/docs/CONTRIBUTIONS.md).
- [ ] **AI Model Name Disclosure**: Confirm exact model selected inside Antigravity in [`AI_DISCLOSURE.md`](file:///home/kira/Downloads/BrandLens/AI_DISCLOSURE.md).
- [ ] **Official Build Window Statement**: `[FILL IN: Team confirmation that all work occurred within the official build window]`.
