# Known Limitations & Issues

This document records architectural boundaries and known limitations of the current BrandLens MVP implementation, along with recommended long-term solutions.

---

### 1. In-Memory Rate Limiting
- **Location**: `src/app/api/content/[id]/review/route.ts` (`checkRateLimit`)
- **Current Behavior**: Rate limiting is tracked using an in-memory `Map<string, number[]>` (10 requests per minute per user).
- **Impact**: In a multi-instance serverless deployment (such as scaled Vercel edge/serverless functions), rate-limit state is isolated to the instance container and resets upon cold restart.
- **Recommended Fix**: Migrate rate-limiting counters to an external distributed store like Upstash Redis (`@upstash/ratelimit`) or a Supabase RPC counter table.

---

### 2. Lexical Keyword Retrieval for Governance Rules
- **Location**: `src/lib/review/retrieve.ts`
- **Current Behavior**: Relevance matching between content sentences and library guidelines/facts uses normalized token overlap, case-insensitive substring matching, and category filtering.
- **Impact**: Submissions with novel phrasing or figurative expressions might have lower lexical overlap and trigger `needs_human_check = true` rather than automatically pairing with an existing guideline.
- **Recommended Fix**: Implement pgvector vector embeddings (e.g. Gemini `text-embedding-004`) for hybrid lexical + semantic search in PostgreSQL.

---

### 3. File Import Format Scope
- **Location**: `src/lib/library/markdown-parser.ts`
- **Current Behavior**: Library guideline import supports `.md` and `.txt` files or direct copy-paste.
- **Impact**: Proprietary document formats (`.docx`, `.pdf`) must be converted or pasted as text prior to ingestion.
- **Recommended Fix**: Introduce a server-side document parsing library (`pdf-parse`, `mammoth`) with client-side drag-and-drop support.
