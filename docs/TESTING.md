# BrandLens Comprehensive Testing Record

This document records **10 structured browser journeys** testing every critical governance workflow across **BrandLens Round 3 ("The Finish")**.
Every journey can be reproduced step-by-step using the pre-seeded demo environment (`npm run seed` with demo organization **Verdant Skin**).

---

## Journey Matrix Overview

| # | Journey Title | Persona | Primary Goal | Key Features Tested |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Demo Persona Sign-In & Switching | All 4 Roles | Rapidly authenticate as any role | One-click persona switcher, copyable credentials, DEMO_MODE safety |
| **2** | Creator Quick-Start with Sample Post | Chloe Creator | Initiate draft review in 1 click | "Try with a sample post" pre-filler, input validation, char limits |
| **3** | In-Memory Document Import (.docx & .pdf) | Chloe Creator | Extract text without file storage | Zero document storage, memory buffer disposal, 10,000 char limit truncation |
| **4** | Verifiable Review & Source Grounding | Chloe Creator | Verify every finding cites a source | `[✓ Verified verbatim]`, SHA-256 source hash, ungrounded downgrade to `needs_human_check` |
| **5** | Stale Source Detection & Re-Review | Aiden Admin & Chloe | Detect when rules change after review | "Source changed since this review" warning badge, 1-click re-run review |
| **6** | Deterministic Intent Guard & Accept-Anyway | Chloe Creator | Preserve creator meaning & override | Word-level chip diffs, intent guard check, "Accept anyway..." justification modal |
| **7** | Multi-Stage Human Approval & Separation of Duties | Chloe, Marcus, Rachel | Route through approval workflow | Creator cannot approve own draft, Manager cannot approve high-risk claims, Reviewer sign-off |
| **8** | Guideline Revision History & Visual Diffs | Aiden Admin | Audit rule evolution over time | `guideline_versions` table, revision history modal, side-by-side word diffs |
| **9** | Library Contradiction Detector & Impact Metrics | Aiden Admin | Discover rule tensions & track impact | `detectConflicts` cross-library analysis, before-and-after dispute metrics, <5 sample safety guard |
| **10** | Demo Data Safe Restore & Append-Only Audit | Marcus & Aiden | Reset workspace safely without wipe | Restore Demo Content endpoint, DEMO_MODE 403 block on destructive wipe, append-only `audit_log` |

---

## Detailed Journey Specifications

### Journey 1: Demo Persona Sign-In & Switching
- **Persona**: All 4 Demo Roles (`creator`, `manager`, `reviewer`, `admin`)
- **Preconditions**: Application running on `http://localhost:3000`, database seeded.
- **Step-by-Step Actions**:
  1. Navigate to `/login`.
  2. Observe the "Demo Access" quick sign-in grid with 4 cards:
     - Chloe Creator (`creator@verdant.demo`)
     - Marcus Manager (`manager@verdant.demo`)
     - Rachel Reviewer (`reviewer@verdant.demo`)
     - Aiden Admin (`admin@verdant.demo`)
  3. Click "Sign in as Creator".
  4. Verify instant authentication and redirection to `/dashboard`.
  5. Check top navigation bar: user profile displays "Chloe Creator" with role badge `[CREATOR]`.
  6. Sign out via user menu and repeat with "Sign in as Manager" and "Sign in as Admin".
- **Expected UI Response**: Instant sign-in without typing credentials; copyable credential panel provided below grid (`verdant12110`).
- **Audit & Database State**: Profile verified against `profiles` table; session established in `@supabase/ssr` cookies.

---

### Journey 2: Creator Quick-Start with Sample Post
- **Persona**: Chloe Creator (`creator@verdant.demo`)
- **Preconditions**: Signed in as Creator.
- **Step-by-Step Actions**:
  1. Navigate to `/content/new` (or click "New content" on dashboard).
  2. In the "Quick start for review" banner at the top of the form, click **"Try with a sample post"**.
  3. Observe all form fields automatically populated:
     - Title: `Verdant Skin Botanical Dew Drops Launch Copy`
     - Channel: `Instagram / Social Media`
     - Audience: `Conscious consumers seeking clean hydration`
     - Body: Copy containing deliberate claims ("miracle", "cure chronic eczema", "erase deep wrinkles in 48 hours", "100% all-natural").
  4. Verify character counter updates (`~350 / 10,000 chars`).
  5. Click **"Create draft"**.
- **Expected UI Response**: Form submits with loading state ("Creating draft..."), and redirects to `/content/[id]`.
- **Audit & Database State**: Record inserted in `contents` with `status: 'draft'`, initial version 1 created in `content_versions`, audit entry `content.create` logged.

---

### Journey 3: In-Memory Document Import (.docx & .pdf)
- **Persona**: Chloe Creator (`creator@verdant.demo`)
- **Preconditions**: Have a `.docx` or `.pdf` file under 5 MB.
- **Step-by-Step Actions**:
  1. Navigate to `/content/new`.
  2. Drag and drop or click "Browse file" in the "Import from document" dashed box.
  3. Select a `.pdf` document.
  4. Observe extraction progress ("Extracting text in-memory...").
  5. Verify text is extracted directly into the "Copy draft text" textarea.
  6. Notice the title is auto-suggested from the file name if previously empty.
  7. Notice success notification: `Successfully extracted N characters from "filename.pdf" (PDF). File discarded from memory.`
  8. (Edge Test) Upload an unsupported file (e.g. `.png`): observe immediate error message `Unsupported file type. Only Word documents (.docx) and PDF files (.pdf) are supported.`
- **Expected UI Response**: Seamless in-browser text extraction without page reload; textarea populated.
- **Audit & Database State**: Binary buffer is discarded immediately from volatile memory. Zero rows written to storage buckets. Audit entry `content.import_file` recorded in `audit_log`.

---

### Journey 4: Verifiable Review & Source Grounding
- **Persona**: Chloe Creator (`creator@verdant.demo`)
- **Preconditions**: Draft opened on `/content/[id]`.
- **Step-by-Step Actions**:
  1. Click **"Run brand review"**.
  2. Wait for the dual-engine pipeline to complete (rule engine + Gemini judge).
  3. Inspect findings displayed in the right rail and margin notes:
     - Every finding cites a specific source: `[Guideline: Claims Policy]`, `[Term: cure]`, or `[Fact: Formulation Audit]`.
     - Findings citing verified quotes display the **`[✓ Verified verbatim]`** green badge.
     - Hover over `[✓ Verified verbatim]` to verify quote matching.
  4. Switch to the **"AI Disclosure"** tab in the content view.
  5. Observe the **"Grounding & citation integrity"** panel showing:
     - Total citations generated.
     - Verbatim verified percentage.
     - Ungrounded findings downgraded to `Needs human check`.
- **Expected UI Response**: Strict adherence to "NO SOURCE, NO FLAG". Zero hallucinations presented as brand verdicts.
- **Audit & Database State**: `findings` rows contain `source_type`, `source_id`, `source_quote`, `source_hash` (SHA-256), `source_version`, and `quote_verified = true`. `ai_runs` records `citations_total`, `citations_verified`, `citations_downgraded`.

---

### Journey 5: Stale Source Detection & Re-Review
- **Persona**: Aiden Admin (`admin@verdant.demo`) then Chloe Creator (`creator@verdant.demo`)
- **Preconditions**: Content reviewed in Journey 4 citing a specific guideline (e.g., "Claims Policy").
- **Step-by-Step Actions**:
  1. Sign in as Aiden Admin. Navigate to `/library`.
  2. Find the cited guideline ("Claims Policy") and click "Edit".
  3. Modify the guideline body text slightly and click "Save changes". (This changes the guideline's SHA-256 hash and increments version).
  4. Sign back in as Chloe Creator.
  5. Navigate back to the reviewed draft in `/content/[id]`.
  6. Inspect the finding that cited the modified guideline.
  7. Observe the prominent amber badge: **"Source changed since this review"** with a **"Re-run review"** button.
  8. Click "Re-run review".
- **Expected UI Response**: Review engine re-runs against the latest library state; source hash updates; warning badge clears.
- **Audit & Database State**: Stale detection compares finding's `source_hash` with SHA-256 of current guideline text. Re-run creates fresh findings with current `source_hash`.

---

### Journey 6: Deterministic Intent Guard & Accept-Anyway
- **Persona**: Chloe Creator (`creator@verdant.demo`)
- **Preconditions**: Finding open with a suggestion that alters meaning (or flagged with `intent_check: 'changed'`).
- **Step-by-Step Actions**:
  1. On `/content/[id]`, locate an open finding card.
  2. Observe the **"What changed"** word-level chip diff displaying added words in green and removed words in red strikethrough.
  3. Inspect the intent badge:
     - If `Meaning preserved`: standard "Accept" button is active.
     - If `Meaning may have changed`: button shows **"Accept anyway..."** with amber warning.
  4. Click **"Accept anyway..."**.
  5. A modal dialog opens: *"Accept with intent override"*.
  6. Attempt to submit with empty justification: form blocks submission.
  7. Type justification: *"Approved by clinical lead for promotional campaign"* and confirm.
- **Expected UI Response**: Finding accepted; new version `v(N+1)` created non-destructively; body updated with replacement; badge updates to `[ACCEPTED (OVERRIDE)]`.
- **Audit & Database State**: Finding updated with `status: 'accepted'`, `intent_override_reason` stored. Audit entry `finding.accept_override` logged with justification.

---

### Journey 7: Multi-Stage Human Approval & Separation of Duties
- **Persona**: Chloe Creator, Marcus Manager, Rachel Reviewer
- **Preconditions**: Reviewed draft with open findings.
- **Step-by-Step Actions**:
  1. **Chloe Creator**: Resolves or disputes findings, clicks **"Submit for review"**. Content moves from `draft` to `in_review`.
  2. Chloe verifies she *cannot* approve her own content (Approve button disabled; Rule 3 enforced).
  3. **Marcus Manager**: Logs in. Views draft under "Awaiting review" on dashboard.
  4. If high-severity clinical findings remain open (`requires_reviewer: true`), Marcus observes "Approve" button disabled with explanation: *"Requires Reviewer approval due to high-severity clinical claims"*.
  5. Marcus clicks "Request changes" with comment: *"Please tone down 48-hour claim"*. Status moves to `needs_changes`.
  6. Chloe updates draft to v2 and re-submits.
  7. **Rachel Reviewer**: Logs in. Inspects clinical fact citations. Approves the draft with sign-off note. Status moves to `approved`.
  8. **Chloe Creator**: Logs back in. Observes "Publish" button is now active. Clicks "Mark as published". Status moves to `published`.
- **Expected UI Response**: Clear role-based governance at each stage. Human-in-the-loop decisions strictly enforced.
- **Audit & Database State**: Transitions recorded in `contents.status`; all workflow state changes appended to `audit_log` with actor ID and comments.

---

### Journey 8: Guideline Revision History & Visual Diffs
- **Persona**: Aiden Admin (`admin@verdant.demo`)
- **Preconditions**: Signed in as Admin.
- **Step-by-Step Actions**:
  1. Navigate to `/library`.
  2. Locate any guideline and click the **"History"** button in its card header.
  3. A modal opens: *"Revision History — [Guideline Title]"*.
  4. Inspect the timeline of revisions (v1, v2, etc.) showing:
     - Version number.
     - Date and author.
     - Change note (e.g. *"AI clarification applied from proposal"*).
     - Inline word-level diff showing exact modifications compared to previous version.
  5. Close the history modal.
- **Expected UI Response**: Fast, readable revision history dialog with zero page refreshes.
- **Audit & Database State**: Revisions queried from `guideline_versions` table ordered by `version DESC`.

---

### Journey 9: Library Contradiction Detector & Impact Metrics
- **Persona**: Aiden Admin (`admin@verdant.demo`)
- **Preconditions**: Signed in as Admin.
- **Step-by-Step Actions**:
  1. Navigate to `/insights`.
  2. Scroll to the **"Possible library contradictions"** card:
     - Observe automated analysis detecting rule tensions (e.g. banned term "natural" vs preferred term "100% natural", or claim policies with opposing polarities).
     - Inspect severity tag (`High`, `Medium`) and explanation.
  3. Scroll to the **"Guideline clarification impact"** card:
     - Inspect applied proposals.
     - If fewer than 5 findings exist before/after, observe safe guard: *"Not enough data yet (< 5 findings in window)"*.
     - If $\ge 5$ findings exist, observe empirical dispute reduction percentage: `Dispute rate changed from X% to Y% (-Z% relative reduction)`.
- **Expected UI Response**: Data-driven closed-loop governance metrics without fabricated or synthetic data.
- **Audit & Database State**: Evaluated via pure modules `conflicts.ts` and `impact.ts` with strict 30-day timeframes.

---

### Journey 10: Demo Data Safe Restore & Append-Only Audit
- **Persona**: Marcus Manager (`manager@verdant.demo`) & Aiden Admin (`admin@verdant.demo`)
- **Preconditions**: `DEMO_MODE=true` in environment.
- **Step-by-Step Actions**:
  1. Sign in as Marcus Manager. Navigate to `/settings`.
  2. Locate "Danger Zone — Start fresh".
  3. Attempt to click "Start fresh": observe the operation is blocked with a clear warning: *"Disabled in DEMO_MODE to protect showcase data"*.
  4. Locate "Demo Data Maintenance — Restore demo content".
  5. Click **"Restore demo content"** and confirm in the confirmation modal.
  6. Observe progress toast and success message: *"Demo data restored successfully."*
  7. Navigate to `/dashboard` and verify canonical showcase items A through E are intact.
  8. Inspect the audit log in `/settings` (or via Admin): verify `org.restore_demo` and `org.start_fresh_blocked` entries are recorded.
- **Expected UI Response**: Demo showcase data is protected against accidental destruction; restore action re-seeds canonical state cleanly.
- **Audit & Database State**: Audit log remains completely intact (append-only); `org.start_fresh_blocked` and `org.restore_demo` appended.

