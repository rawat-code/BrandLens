# Services, APIs & Dependencies Directory

Comprehensive catalog of third-party APIs, AI foundation models, databases, libraries, and scaffold templates utilized within **BrandLens**.

---

## 1. Foundation Models & AI Services

| Service / Provider | Model Name / Identifier | Purpose in BrandLens | Configuration & Fallbacks |
| :--- | :--- | :--- | :--- |
| **Google Gemini API** (`@google/genai`) | `gemini-3.5-flash-lite` | Primary AI engine for review judgement, grounded source citation, tone & messaging analysis, and rewrite suggestions. | Configured via `GEMINI_MODEL` with a 20s execution timeout and 1 automatic retry. |
| **Google Gemini API** (`@google/genai`) | `gemini-3.1-flash-lite` | Secondary fallback model when primary model encounters rate limits, latency spikes, or service degradation. | Configured via `GEMINI_FALLBACK_MODEL`. |
| **Google Gemini API** (`@google/genai`) | `gemini-3.5-flash-lite` | Guideline clarification engine: analyzes aggregated dispute reasons and proposes clearer policy phrasing. | Invoked server-side only in `/api/insights/proposals/generate`. |

---

## 2. Cloud Infrastructure & Platform Services

| Service | Provider | Architecture Role | Security & Access Pattern |
| :--- | :--- | :--- | :--- |
| **Supabase Database** | Supabase (AWS) | Relational database (PostgreSQL) storing orgs, profiles, guidelines, facts, terms, contents, versions, findings, ai_runs, and audit logs. | Row Level Security (RLS) enabled on all tables. All access strictly mediated via server-side service-role client. Anon key has zero public read policies. |
| **Supabase Auth** | Supabase | User authentication, identity tokens, and session management. | Handled via `@supabase/ssr` cookies. User role and organization boundary resolved server-side. |
| **Serverless Deployment** | Vercel | Next.js 15 App Router production hosting and edge/serverless compute. | Configured with `maxDuration = 60` for AI pipeline endpoints and strict HTTP security response headers. |

---

## 3. Production Dependencies & Exact Versions

Extracted directly from `package.json`:

| Package | Exact / SemVer Version | Category | Purpose |
| :--- | :--- | :--- | :--- |
| `@google/genai` | `^2.32.0` | Production | Official Google Gemini GenAI SDK for structured review analysis. |
| `@supabase/ssr` | `^0.12.7` | Production | Server-side Supabase client for Next.js App Router cookies. |
| `@supabase/supabase-js` | `^2.119.0` | Production | Supabase client library for admin database operations. |
| `next` | `15.5.29` | Framework | React framework with App Router, server actions, and streaming. |
| `react` | `19.1.0` | UI Library | Core declarative user interface library. |
| `react-dom` | `19.1.0` | UI Library | DOM renderer for React. |
| `zod` | `^4.6.7` | Validation | Runtime type validation for API bodies, findings, and Gemini JSON outputs. |

---

## 4. Development & Testing Dependencies

| Package | Exact / SemVer Version | Category | Purpose |
| :--- | :--- | :--- | :--- |
| `vitest` | `^5.1.0` | Testing | Fast unit and integration test runner. |
| `typescript` | `^5` | Language | Strict static typing across codebase. |
| `tailwindcss` | `^4` | Styling | Utility-first CSS engine for accessible, responsive design. |
| `@tailwindcss/postcss` | `^4` | PostCSS Plugin | PostCSS integration for Tailwind CSS v4. |
| `eslint` | `^9` | Code Quality | Linter enforcing code hygiene and best practices. |
| `eslint-config-next` | `15.5.29` | Code Quality | Next.js-specific ESLint rules (hooks, image, core-web-vitals). |
| `tsx` | `^4.23.15` | Script Execution | TypeScript execution engine for database seeding and eval benchmarks. |
| `@types/node` | `^22.20.5` | Type Definitions | Node.js runtime type definitions. |
| `@types/react` | `^19` | Type Definitions | React type definitions. |
| `@types/react-dom` | `^19` | Type Definitions | React DOM type definitions. |
| `ws` | `^8.22.1` | Testing / Tooling | WebSocket client for CDP screenshot capture and local automation scripts. |

---

## 5. Scaffold & Template Attribution

- **Project Scaffolding**: Initial repository structure generated via official `create-next-app` (Next.js 15 App Router with TypeScript and Tailwind CSS).
- **Custom Implementations**: All business logic, UI components, review pipeline algorithms, deterministic rules, lexical retrievers, and database schemas were built ground-up for BrandLens. No pre-built UI templates or third-party component libraries (e.g., shadcn, MUI, Chakra) were used, maintaining minimal dependencies and WCAG AA accessibility.
