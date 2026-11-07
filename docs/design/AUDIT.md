# BrandLens UI Audit: Redline Transition (Stage A)

This audit documents the transition from the dark/glass template-like interface to direction **B. Redline**: a proofreader's desk aesthetic built with warm paper, ink, serif reading typography, and numbered margin notes.

---

## 1. Current State (Before) vs. Redline Direction (Target)

| Dimension | Current State | Redline Target |
| :--- | :--- | :--- |
| **Aesthetic & Mood** | Dark luxury / AI SaaS (`#0a0a10`, dark indigo/violet accents, glowing states, glass blur) | Proofreader's desk: warm paper background (`#f5f1e8`), ink text (`#1f1c18`), quiet editorial authority |
| **Surfaces & Cards** | Dark panels with soft glow, floating cards, subtle gradients | Flat paper sheets (`#fffdf8`) with crisp 1px `#ddd5c4` borders. No shadows, no gradients, no glass blur |
| **Typography** | `Instrument Serif` + `Geist Sans` + `Geist Mono` | `Newsreader` (titles, reading text, source quotes) + `IBM Plex Sans` (UI body/controls) + `IBM Plex Mono` (labels, diffs, timestamps) |
| **Corner Radius** | Rounded corners (8px–16px), pill badges | Square corners (`rounded-none` / 0px radius) across all buttons, inputs, chips, dialogs, cards |
| **Navigation Shell** | Fixed left sidebar navigation with icon stack | Top navigation bar with paper background, Newsreader brand text, plain text links with ink bottom underline on active, role and signout on right |
| **Findings Presentation**| Left border color cards in an accordion list | Numbered margin notes adjacent to the reading pane; 4px top severity border; superscript callouts in text; solid red, yellow highlighter, and dotted blue underlines |
| **Diff Presentation** | Basic text replacement blocks | Monospace inline diff blocks on `#f5f1e8` with red strikethrough deletions and green underlined insertions |
| **Motion** | Multi-step spring animations, staggered entry | Strictly 120ms opacity or underline transitions; full prefers-reduced-motion compliance; static grey skeleton notes with zero shimmer |
| **Microcopy & Tone** | Marketing-tinged SaaS copy, emojis, arrow glyphs | Plain, specific editorial language. Verbs on buttons ("Run review", "Accept", "Dispute"). No exclamation marks, no em dashes |

---

## 2. Page-by-Page Audit & Planned Changes

### 1. Global Shell (`AppShell.tsx`, `layout.tsx`, `globals.css`)
- **Current**: Left dark sidebar with BL logo, collapse states, floating command palette.
- **Change**: Replace sidebar with a clean top bar (`bg-[#fffdf8] border-b border-[#ddd5c4] px-10 py-3.5`).
  - Left: "BrandLens" in Newsreader (20px).
  - Center/Nav: Plain text links (`Content` / `Review queue`, `New content`, `Library`, `Insights`, `Settings`, `About`) filtered by user role; active item indicated by ink text and a 2px ink underline.
  - Right: Workspace name ("Verdant Skin"), user role, and "Sign out" link in secondary ink (`#5e574c`, 12px).
  - Global CSS: CSS variables `--page-bg: #f5f1e8`, `--paper-bg: #fffdf8`, `--border: #ddd5c4`, `--text-ink: #1f1c18`, `--text-secondary: #5e574c`, `--severity-high: #b3261e`, `--severity-med: #8a5a00`, `--severity-med-bg: #f6e3b4`, `--severity-low: #1d4f9c`, `--severity-neutral: #5e574c`, `--severity-success: #1f6b3a`.

### 2. Login Page (`/login`)
- **Current**: Dark split screen with animated constellation canvas, dark persona cards.
- **Change**: Centered paper panel on `#f5f1e8` background.
  - Header: "BrandLens" in Newsreader 38px, followed by one plain sentence explaining pre-publication brand governance.
  - Form: Square inputs with ink borders, ink primary submit button.
  - Persona Quick Select: Plain ledger-style list with label "Demo workspace: Verdant Skin (fictional)". No canvas animations or glows.

### 3. Dashboard / Review Queue (`/dashboard`)
- **Current**: Stat cards with gradient borders followed by content table.
- **Change**:
  - Header: Page title in Newsreader 38px, single meta line of counts in secondary text (e.g., `3 drafts, 1 awaiting review, 1 approved`). Eliminate all stat cards.
  - Review queue (Managers & Reviewers): Ledger table on `#fffdf8` paper, 1px rules, sorted by highest open severity then age, with per-row severity summary (e.g., `1 high, 2 medium`).
  - Content list (Creators): Ledger table with square status chips and inline SVG shapes per state.
  - Status filter: Plain segmented control with 1px border and ink active selection.

### 4. Content Detail Workbench (`/content/[id]`)
- **Current**: Two-column layout with dark theme, accordion cards.
- **Change**: The centerpiece proofreader's desk!
  - Header: Newsreader 38px title, meta line (`In review · Version 3 · Social · Submitted by ...`), workflow action buttons (`Request changes`, `Approve`).
  - If approval blocked: Approve button disabled with clear reason beside it.
  - Reading Pane (Left, 1fr): `#fffdf8` paper block, 1px border, 34px 38px padding, Newsreader 24px, line-height 2.1.
  - Flagged text:
    - High severity: 2px solid red underline (`#b3261e`).
    - Medium severity: highlighter background `#f6e3b4` with `#8a5a00` text hint.
    - Low severity: 2px dotted blue underline (`#1d4f9c`).
    - Superscript note numbers in IBM Plex Mono.
    - Click scrolls to note; hover/focus syncs between text and note.
    - Keyboard: `J` and `K` cycle notes; `Enter` focuses.
  - Margin Notes (Right, 440px):
    - Paper notes with 1px border and 4px top border in severity colour.
    - Top label: `HIGH · CLAIM · NOTE 1` in Plex Mono uppercase.
    - One-sentence reason.
    - Source citation: Newsreader italic with 2px left border rule and link to library item.
    - Diff block: `#f5f1e8` background, Plex Mono, red strikethrough deletions, green underlined additions.
    - Intent line: "Meaning preserved" (green) or "Meaning may have changed" with note.
    - Action buttons: Accept (primary), Edit, Dispute, Dismiss. Inline reason inputs for Dispute/Dismiss.
    - "NEEDS HUMAN CHECK" label for unverified findings (neutral top border).
    - "AI-assisted" tag for AI origin findings.
    - Confidential banner when AI review is disabled.
  - Lower Tabs: Comments, History (readable side-by-side diff), Activity (ledger list with timestamps), AI Disclosure.

### 5. Content Creation (`/content/new`)
- **Current**: Multi-card form with dark inputs and pill toggles.
- **Change**: Clean editorial desk sheet: title input, channel select, confidential checkbox with plain explanatory text, body textarea styled like paper manuscript with character count meter (up to 10,000 chars).

### 6. Library (`/library`)
- **Current**: Dark tabs and dark cards.
- **Change**: Paper ledger tables for Guidelines, Facts, and Terms.
  - Plex Mono labels for headers and tags.
  - Inline actions ("Edit", "Retire").
  - "Expired" label with exact date for stale facts.
  - Modal dialogs for creation and editing in crisp paper with square corners.

### 7. Insights (`/insights`)
- **Current**: Heavy gradient SVG charts, dark background.
- **Change**:
  - Clean inline SVG charts with solid ink bars and a diagonal hatch pattern for secondary series. Direct text labels on bars.
  - Data table directly underneath each chart.
  - Synthetic demo history clearly labelled "Demo data".

### 8. Settings & About (`/settings`, `/about`)
- **Current**: Dark forms, glowing cards.
- **Change**:
  - Settings: Structured definition lists with paper borders, square action buttons, clear danger zone for reset.
  - About: Newsreader headings, editorial prose, definition lists detailing rules, AI transparency, and system boundaries.

### 9. Print View
- **Change**: Dedicated `@media print` rules for the content detail workbench:
  - White background, hides shell navigation, action buttons, and lower tabs.
  - Produces an elegant printed proofreader report with title, metadata, reading text with note indices, and the margin notes ledger below.
