# BrandLens

> Pre-publication brand-governance & AI compliance review platform. Built for the Inkloom AI Hackathon (Round 2).

Live Deployment: `[Deploy Link Placeholder - e.g. https://brandlens.vercel.app]`

---

## Overview

When creators submit marketing copy, BrandLens automatically audits the draft against the organisation's approved guidelines, clinical facts, and terminology library. Every issue found cites its exact source, explains the compliance risk, and suggests an intent-preserving fix. 

**Core Product Philosophy: AI suggests, humans decide.** AI never approves, publishes, or rewrites content autonomously.

### Non-Negotiable Product Rules

1. **NO SOURCE, NO FLAG**: Every finding must cite a guideline, fact, or term from the organisation's library. If it cannot, it is marked `needs_human_check = true` and shown as "Needs human check", never as an automated verdict.
2. **AI Suggests, Humans Decide**: Suggestions are applied only when a user clicks Accept, one issue at a time.
3. **Separation of Duties**: Creators can never approve their own content.
4. **Confidentiality Guard**: Content marked confidential is never transmitted to the external AI service; only local deterministic rule checks run on it.
5. **PII and Secret Redaction**: Emails, phone numbers, and API-key-like strings are redacted before any text reaches the AI service.
6. **Data vs. Instructions**: Content under review is treated strictly as DATA, enclosed within delimiters in prompts to prevent instruction injection.
7. **Append-Only Audit Log**: Every state transition, suggestion decision, and human review is permanently logged in `audit_log`.
8. **Graceful Degradation**: If an AI request times out or fails, deterministic rule findings are returned with an explicit "AI review unavailable" banner.

---

## Demo Organization & Seeded Accounts

BrandLens comes seeded with a fictional skincare brand: **Verdant Skin**.

Password for all seeded demo accounts: Defined by `DEMO_PASSWORD` in your `.env` (default: `verdant12110`).

| Role | Email | Permissions & Workflow |
| :--- | :--- | :--- |
| **Creator** | `creator@verdant.demo` | Create and edit own drafts, run reviews, accept/dispute suggestions, submit for approval, publish approved work. *Cannot approve or reject.* |
| **Manager** | `manager@verdant.demo` | Review org content, approve / request changes / reject (never own drafts). Cannot approve items with unresolved high-severity flags requiring reviewer sign-off. |
| **Reviewer** | `reviewer@verdant.demo` | View assigned/in-review content, comment, approve / request changes / reject high-severity flags (never own drafts). |
| **Admin** | `admin@verdant.demo` | Manage governance library (guidelines, approved facts, terminology), user profiles, view full audit logs and compliance insights. |

The `/login` screen includes **"Try a demo role"** one-click buttons to instantly test the application under any of these personas.

---

## Minimal Dependencies

In strict compliance with our minimalist architecture requirements, only essential libraries are installed:

- `next`: React framework (App Router)
- `react`, `react-dom`: UI rendering engine
- `@supabase/supabase-js`: Supabase database & authentication client
- `@supabase/ssr`: Server-side cookie session management for Supabase
- `@google/genai`: Official Google Gemini SDK for governance judgements
- `zod`: Schema validation for AI outputs and domain models
- `tailwindcss`, `@tailwindcss/postcss`: Utility-first CSS styling
- `vitest` *(dev)*: Fast unit test suite
- `tsx` *(dev)*: TypeScript script runner for database seeding

---

## Environment Variables

Copy `.env.example` to `.env` and supply the required values:

```bash
cp .env.example .env
```

| Variable | Description | Location |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Client & Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (bypasses RLS for server actions) | Server-only |
| `GEMINI_API_KEY` | Google Gemini API key | Server-only |
| `GEMINI_MODEL` | Primary Gemini model (e.g. `gemini-3.5-flash-lite`) | Server-only |
| `GEMINI_FALLBACK_MODEL` | Fallback model (e.g. `gemini-3.1-flash-lite`) | Server-only |
| `DEMO_PASSWORD` | Password assigned to demo seed accounts (min 6 characters) | Server & Seed script |

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ or 22+
- npm / pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Database
Run the idempotent seed script to populate the "Verdant Skin (demo)" organization, 4 demo users, 5 guidelines, 8 facts, 10 terms, and sample content versions:

```bash
npx tsx scripts/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the login screen and test the demo roles.

### 5. Run Test Suite
```bash
npm test
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## Deployment to Vercel

1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Configure the Environment Variables listed above in project settings.
4. Set Build Command to `npm run build` and Output Directory to `.next`.
5. Deploy!
