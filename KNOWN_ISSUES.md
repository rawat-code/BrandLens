# Known Limitations & Technical Debt

Last verified against code: 2026-11-07

This document provides a transparent accounting of known bugs, architectural boundaries, and limitations discovered during code inspection and benchmark evaluation of the **BrandLens** Round 2 build.

---

### 1. Expired Fact Detection Misses Non-Numeric Statements
- **Location**: `src/lib/review/rules.ts:328–330`
- **Symptom**: In the evaluation benchmark (`eval/RESULTS.md:22`), 0 of 2 expired fact samples (`syn-29`, `syn-30`) were detected by the `fact.expired` rule.
- **Root Cause**: The fact evaluation logic in `rules.ts` is guarded by:
  ```typescript
  if (hasTimeframe || hasNumeric || hasAbsolute) { ... }
  ```
  Expired facts that do not contain numbers, timeframes, or absolute words (such as promotional claims: *"Complimentary botanical sample kit with every monsoon order"*) never trigger the regex guard. As a result, fact lexical overlap matching is skipped entirely.
- **Impact**: Non-numeric expired claims escape deterministic fact expiration detection.
- **Workaround**: Authors or reviewers must manually verify promotional expiry in the library until patched.
- **Planned Fix**: Remove the regex precondition so every sentence is compared against retired and expired facts in the database, with a calibrated token overlap threshold.

---

### 2. Readability Linter Over-Sensitivity on Clean Marketing Copy
- **Location**: `src/lib/review/rules.ts:584–600` (`a11y.readability`)
- **Symptom**: Clean posts in the evaluation benchmark suffered a 40.0% false-flag rate (4 of 10 clean posts flagged).
- **Root Cause**: The rule computes the Flesch-Kincaid grade level and flags any content with grade level $> 10$. In botanical skincare and clinical marketing, multi-syllable domain terminology (e.g. *"dermatological"*, *"formulation"*, *"Centella Asiatica"*, *"sustainable packaging"*) artificially inflates the grade score above 10.
- **Impact**: Creators face unnecessary warning flags on compliant, well-written copy.
- **Workaround**: Creators can safely dismiss the reading grade note with reason *"Technical vocabulary required for clinical accuracy"*.
- **Planned Fix**: Increase threshold to grade 12 for blog/editorial channels, or exempt domain terms defined in the organization terminology dictionary from syllable weighting.

---

### 3. Edit-Then-Accept Parameter Mismatch Bug
- **Location**: `src/components/ContentDetailView.tsx:321` vs `src/app/api/findings/[id]/accept/route.ts:52`
- **Symptom**: When a creator clicks "Edit" on a finding, types a custom rewrite in the modal, and submits, the backend applies the default suggested fix instead of the custom user text.
- **Root Cause**: The client component passes `{ custom_replacement: customSuggestionText.trim() }` in the POST body, but the API route handler expects `{ custom_suggestion: string }`. Because `requestJson.custom_suggestion` is undefined, the route handler falls back to `finding.suggestion`.
- **Impact**: Custom suggestion edits are ignored; default suggestions are accepted.
- **Workaround**: Creators can accept the default suggestion, and then click **Edit draft** in the header to modify the text in the primary editor.
- **Planned Fix**: Update `ContentDetailView.tsx` to send `custom_suggestion`, or update the API route handler to check `requestJson.custom_replacement ?? requestJson.custom_suggestion`.

---

### 4. In-Memory Rate Limiting in Serverless Deployments
- **Location**: `src/app/api/content/[id]/review/route.ts:16` (`checkRateLimit`)
- **Symptom**: Rate limiting is tracked via a local Node.js `Map<string, number[]>` (10 requests per minute per user).
- **Impact**: In a multi-region or autoscaling serverless deployment (such as Vercel Edge/Serverless functions), rate limit state is isolated to individual function instances. A cold start or routing to a parallel serverless container resets the counter.
- **Workaround**: The current threshold prevents runaway loops within an active instance.
- **Planned Fix**: Connect rate-limiting to Upstash Redis (`@upstash/ratelimit`) or execute an atomic Supabase RPC increment in PostgreSQL.

---

### 5. Absence of Direct Image, PDF & Word Binary Parsers
- **Location**: `package.json`, `src/components/ContentForm.tsx`
- **Symptom**: Round 1 planned image upload (PNG/JPG with palette/contrast analysis) and document parsing (PDF and Word `.docx`). Neither `sharp`, `pdf-parse`, nor `mammoth` is installed.
- **Impact**: Users cannot upload PDF briefs or Word documents directly. Content must be pasted as text. Visual and color contrast checks are not performed on uploaded images.
- **Workaround**: Authors paste text copy directly into the Markdown editor (`/content/new`). Guideline imports support raw text and Markdown paste (`/library`).
- **Planned Fix**: Install `pdf-parse` and `mammoth` on server-side Next.js route handlers with drag-and-drop file upload zones.

---

### 6. Pure Lexical Retrieval Paraphrase Blindspots
- **Location**: `src/lib/review/retrieve.ts:10` (`retrieveCandidateGuidelines`)
- **Symptom**: Relevance matching between draft copy and library guidelines relies on tokenized word overlap after stopword removal.
- **Impact**: When marketing copy expresses a violation using novel, metaphorical, or heavily paraphrased phrasing that shares few lexical tokens with the guideline title or body, candidate retrieval may score below threshold. If Gemini is not presented with the relevant guideline, the finding is safely downgraded to `needs_human_check = true`.
- **Workaround**: Guidelines should include clear keywords and common violation patterns in their application guidance notes.
- **Planned Fix**: Implement hybrid lexical + dense vector search using Supabase PostgreSQL `pgvector` with Gemini embeddings (`text-embedding-004`).

---

### 7. AI Tone Linter Over-Flagging on Marketing CTAs
- **Location**: `src/lib/review/judge.ts:50`
- **Symptom**: In benchmark evaluation (`eval/RESULTS.md:25`), the tone category scored 0% precision due to 7 false positives.
- **Root Cause**: The system prompt instructs Gemini to flag pushy urgency and aggressive sales language. Standard marketing calls-to-action (e.g. *"Order today to receive free shipping"*, *"Don't miss our launch"*) were interpreted by the model as aggressive urgency.
- **Impact**: Creators receive low-severity tone suggestions on standard promotional copy.
- **Workaround**: Creators can dispute or dismiss tone findings with one click.
- **Planned Fix**: Refine system prompts with explicit few-shot examples distinguishing standard e-commerce CTAs from predatory urgency or manipulative scarcity tactics.

---

### 8. Single-Tenant Session Profile Fallback
- **Location**: `src/lib/auth.ts:85` (`getSessionProfile`)
- **Symptom**: If an authenticated Supabase user profile has no associated `org_id`, the function falls back to assigning the user to the first existing organization in the `orgs` table.
- **Impact**: Acceptable for the single-tenant demo workspace, but in a multi-tenant production environment with multiple independent companies, this fallback could provision a user into the wrong corporate workspace.
- **Workaround**: In production, organization onboarding should require an explicit organization invitation token or corporate email domain match.
- **Planned Fix**: Enforce mandatory organization invitation tokens during user registration.
