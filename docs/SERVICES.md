# Services, APIs, Dependencies & Data Egress Catalog

Last verified against code: 2026-11-07

This document catalogs all third-party APIs, AI foundation models, cloud infrastructure services, software dependencies, datasets, scaffolding templates, and server data egress boundaries utilized within **BrandLens**.

---

## 1. Foundation Models & AI Services

| Service / Provider | Exact Model Identifier | Source Configuration | Purpose in BrandLens | Timeout & Failover Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini API** (`@google/genai`) | `gemini-3.5-flash-lite` | `process.env.GEMINI_MODEL` (fallback in code: `gemini-3.5-flash-lite`) | Primary review judge, source citation verification, and rewrite suggestion generator. | 20s execution timeout; 1 automatic retry on 503 or transient network errors. |
| **Google Gemini API** (`@google/genai`) | `gemini-3.1-flash-lite` | `process.env.GEMINI_FALLBACK_MODEL` (fallback in code: `gemini-3.1-flash-lite`) | Secondary failover model when primary model encounters rate limits (429) or latency spikes. | Invoked automatically when primary model request fails. |
| **Google Gemini API** (`@google/genai`) | `gemini-1.5-flash` / `gemini-1.5-pro` | Documented in `.env.example` | Baseline reference model configuration for standard Google Cloud AI Studio environments. | Available for deployment environments targeting older API quotas. |

---

## 2. Cloud Infrastructure & Platform Services

| Platform / Service | Provider | Architecture Role | Security & Access Pattern |
| :--- | :--- | :--- | :--- |
| **Supabase Database** | Supabase (AWS eu-west-1) | PostgreSQL relational storage for multi-tenant accounts, guidelines, clinical facts, terms, content, versions, findings, ai_runs, and audit logs. | Row Level Security (RLS) enabled on all 12 tables. All queries mediated via server-side service-role client. Anon key has zero public read policies. |
| **Supabase Auth** | Supabase | User session management and identity cookies. | Handled via `@supabase/ssr` cookies. User role and organization boundary resolved server-side. |
| **Serverless Deployment** | Vercel | Production edge routing and serverless function execution. | Configured with `maxDuration = 60` for AI pipeline endpoints and strict HTTP security response headers. |

---

## 3. Production Dependencies (from `package.json`)

All dependencies listed below are strictly present in `package.json`:

| Package | Exact / SemVer Version | License | Category | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `@google/genai` | `^2.32.0` | Apache-2.0 | Production | Official Google Gemini GenAI SDK for structured review analysis. |
| `@supabase/ssr` | `^0.12.7` | MIT | Production | Server-side Supabase client for Next.js App Router cookies. |
| `@supabase/supabase-js` | `^2.119.0` | MIT | Production | Supabase client library for admin database operations. |
| `cmdk` | `^1.1.1` | MIT | Production | Fast accessible command menu for global Cmd+K palette. |
| `framer-motion` | `^14.10.0` | MIT | Production | Declarative animation primitives for tab transitions and drawer drawers. |
| `next` | `15.5.29` | MIT | Framework | React framework with App Router, server actions, and streaming. |
| `react` | `19.1.0` | MIT | UI Library | Core declarative user interface library. |
| `react-dom` | `19.1.0` | MIT | UI Library | DOM renderer for React. |
| `zod` | `^4.6.7` | MIT | Validation | Runtime type validation for API request bodies, findings, and Gemini JSON outputs. |

---

## 4. Development & Testing Dependencies (from `package.json`)

| Package | Exact / SemVer Version | License | Category | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `vitest` | `^5.1.0` | MIT | Testing | Fast unit and integration test runner. |
| `typescript` | `^5` | Apache-2.0 | Language | Strict static typing across codebase. |
| `tailwindcss` | `^4` | MIT | Styling | Utility-first CSS engine for accessible, responsive design. |
| `@tailwindcss/postcss` | `^4` | PostCSS Plugin | MIT | PostCSS integration for Tailwind CSS v4. |
| `eslint` | `^9` | MIT | Code Quality | Linter enforcing code hygiene and best practices. |
| `eslint-config-next` | `15.5.29` | MIT | Code Quality | Next.js-specific ESLint rules (hooks, image, core-web-vitals). |
| `@eslint/eslintrc` | `^3` | MIT | Configuration | Legacy ESLint configuration compatibility utilities. |
| `tsx` | `^4.23.15` | MIT | Script Execution | TypeScript execution engine for database seeding and eval benchmarks. |
| `playwright` | `^1.65.0` | Apache-2.0 | Testing / Tooling | Headless browser automation for live screenshot captures and verification. |
| `@types/node` | `^22.20.5` | MIT | Type Definitions | Node.js runtime type definitions. |
| `@types/react` | `^19` | MIT | Type Definitions | React type definitions. |
| `@types/react-dom` | `^19` | MIT | Type Definitions | React DOM type definitions. |
| `@types/ws` | `^8.18.2` | MIT | Type Definitions | WebSocket client type definitions. |
| `ws` | `^8.22.1` | MIT | Testing / Tooling | WebSocket client for CDP screenshot capture and local automation scripts. |

---

## 5. Datasets (Synthetic Demo & Benchmark Data)

| Dataset | File Location | Authorship | Contents | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Verdant Skin Governance Library** | `scripts/seed.ts` | Created by Team (Synthetic) | 10 guidelines (tone, claims, accessibility), 10 clinical facts (including 2 expired facts), 10 terminology terms (banned, caution, preferred). | Default demonstration governance library. |
| **Showcase Content Submissions** | `scripts/seed.ts` | Created by Team (Synthetic) | 5 realistic content drafts (`Showcase A` through `Showcase E`) covering social media, clinical blogs, newsletters, and internal briefs. | Pre-seeded end-to-end demo walkthroughs. |
| **Evaluation Benchmark Set** | `eval/data/samples.json` | Created by Team (Synthetic) | 40 labeled samples (10 clean posts, 30 violation posts) with expected rule keys and target categories. | Offline algorithmic accuracy benchmarking (`npm run eval`). |
| **Historical Seed Records** | `src/app/api/insights/seed-demo/route.ts` | Created by Team (Synthetic) | 30-day synthetic audit history with 33 cited findings and 2 disputed guidelines. | Powers `/insights` ambiguity scores and proposal generation in demo mode. |

---

## 6. Scaffold, Template & Asset Attribution

- **Project Scaffolding**: Initial repository structure generated via official `create-next-app` (Next.js 15 App Router with TypeScript and Tailwind CSS; initial commit `5ab6adc` on 2026-11-04).
- **Custom Business Logic**: All business logic, UI components, review pipeline algorithms, deterministic rules, lexical retrievers, and database schemas were built ground-up for BrandLens. No third-party UI component libraries (e.g., shadcn, MUI, Chakra) were used.
- **Typography**:
  - Headings: `Newsreader` (optical serif, licensed under SIL Open Font License, imported via Google Fonts).
  - Body & UI: System font stack (`system-ui`, `-apple-system`, `sans-serif`).
  - Code & Metadata: Monospace font stack (`ui-monospace`, `monospace`).
- **Icons**: Custom accessible inline SVGs with `aria-hidden="true"` and descriptive labels. No third-party icon packages installed.
- **AI Development Tools**: Google Antigravity (agentic AI coding assistant).

---

## 7. What Data Leaves Our Servers?

This table audits every external network egress point across the entire application:

| Feature / Action | Destination Service | Data Transmitted | PII Redaction Applied? | Confidential Drafts Excluded? |
| :--- | :--- | :--- | :---: | :---: |
| **Content Review (Non-Confidential)** | Google Gemini API | Redacted submission text enclosed in `<content>` delimiters + candidate guideline titles and bodies. | **Yes** (Emails, phone numbers, API keys masked) | **Yes** (Confidential drafts never make AI calls) |
| **Content Review (Confidential)** | None (Stays on server) | None. Processed strictly on-server by local deterministic regex and dictionary rules. | N/A | **Yes** (100% excluded from external egress) |
| **Suggestions & Intent Check** | Google Gemini API | Redacted excerpt under review + candidate replacement strings + author context. | **Yes** | **Yes** (Confidential drafts skip suggestion AI) |
| **Guideline Proposal Generation** | Google Gemini API | Aggregated dispute reasons and guideline bodies. No user content or PII sent. | **Yes** | **Yes** |
| **User Authentication** | Supabase Auth API | User email, hashed password, or OAuth tokens during sign-in/up. | N/A (Standard Auth) | N/A |
| **Database Operations** | Supabase PostgreSQL | Relational queries for guidelines, facts, contents, versions, findings, audit logs. | N/A (Direct DB link) | Stored in PostgreSQL with RLS |
| **Static Hosting & Serverless** | Vercel Serverless | Next.js serverless execution traces and HTTP telemetry. | N/A | N/A |
