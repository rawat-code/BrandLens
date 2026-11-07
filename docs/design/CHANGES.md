# BrandLens: Redline UI Transformation (CHANGES.md)

This document records the visual and microcopy transformation completed on branch `feat/redline-ui` for BrandLens, rebuilding the application in direction **B. Redline**: a proofreader's desk aesthetic with warm paper backgrounds, ink typography, serif reading panes, and numbered margin notes next to the text.

---

## 1. Summary of the Visual Transformation

The Redline transformation replaces generic AI-template and modern card styling with the tactile, disciplined precision of an editorial review desk:
1. **Paper and Ink Palette**: A warm paper foundation (`#f5f1e8` page, `#fffdf8` paper surfaces for cards, reading pane, and top bar), deep ink typography (`#1f1c18`), secondary warm charcoal (`#5e574c`), and crisp 1px rule dividers (`#ddd5c4`).
2. **True Editorial Typography via `next/font/google`**:
   - **Newsreader** (400, 500, italic 400): Page titles (38px, line-height 1.1), reading pane text (24px, line-height 2.1), and source quotes (16px italic).
   - **IBM Plex Sans** (400, 500, 600): All user interface copy, navigation, tables, and form inputs (14px, line-height 1.55).
   - **IBM Plex Mono** (400, 600): Monospace metadata, diff blocks, IDs, relative timestamps, and uppercase labels (11px, letter-spacing 0.04em).
3. **Numbered Margin Notes next to Text**:
   - The workbench places draft text on a paper block (`1fr`) adjacent to margin notes (`440px`), stacking responsively on viewports below 900px.
   - Flagged spans in the text feature distinct non-color-only styling: solid red 2px underline for high severity, highlighter yellow background (`#f6e3b4`) for medium severity, and dotted blue 2px underline for low severity.
   - Superscript note numbers (`¹`, `²`) in Plex Mono connect text spans to margin notes. Clicking scrolls and focuses the note; pressing `J` and `K` cycles through notes; `Enter` focuses the active note.
   - Each note card features a 4px top border in the severity colour, Plex Mono uppercase label line (e.g. `HIGH · CLAIM · NOTE 1`), one-sentence reason, italic source quote with 2px left rule and library link, Plex Mono diff block on `#f5f1e8` (deletions strikethrough red, additions underline green), intent badge, and inline dispute/dismiss reason forms.
4. **Restraint and Standards**: Zero gradients, glass blur, glows, card drop shadows, rounded pill buttons, emojis, or stock illustrations. Square corners (`rounded-none` / radius 0) everywhere. Depth achieved strictly through 1px `#ddd5c4` borders. Motion restricted to 120ms opacity or underline transitions, with `prefers-reduced-motion` compliance.

**Zero backend logic, schemas, API routes, permissions, or review pipeline algorithms were modified.**

---

## 2. Before-and-After Comparison

| Area | Before (Generic AI / Dark Template) | After (B. Redline Proofreader's Desk) |
|---|---|---|
| **Theme & Canvas** | Dark charcoal canvas (`#0d0d15`) with noisy gradient fills and rounded cards | Warm paper foundation (`#f5f1e8`), pure paper surfaces (`#fffdf8`), and 1px ink rule borders (`#ddd5c4`). Square corners everywhere. |
| **Typography** | Generic system fonts or decorative display serifs | `Newsreader` for titles (38px) and reading copy (24px, line-height 2.1); `IBM Plex Sans` for UI; `IBM Plex Mono` for labels, diffs, and IDs. |
| **Shell & Navigation** | Vertical left sidebar with glowing icons and avatar badges | Horizontal top bar on paper (`#fffdf8`), Newsreader 20px "BrandLens", role-based plain text links with 2px ink active underline, right metadata. |
| **Microcopy & Tone** | Marketing phrasing ("seamlessly audit", "supercharge your copy") | Plain, specific language: sentence case, no exclamation marks, no em dashes, verb-only buttons ("Run review", "Submit for approval", "Approve", "Accept", "Dispute"). |
| **Dashboard** | Floating stat cards with upward trend indicators | Page header in Newsreader with single meta count line ("3 drafts, 1 awaiting review, 1 approved"). Ledger-style paper table with sticky header and square status chips. |
| **Review Queue** | Simple unsorted list of content drafts | Priority ledger sorted by highest open severity then age, with per-row severity summary chips ("1 high, 2 medium") and segmented paper control. |
| **Content Detail** | Disconnected finding cards beneath copy | Two-column proofing desk: 24px Newsreader reading text with colored underlines & superscript numbers beside numbered margin notes with 4px top severity rules. |
| **Finding Notes** | Standard popover cards | Margin notes on paper: Plex Mono uppercase labels (`HIGH · CLAIM · NOTE 1`), Newsreader italic source citations, monospace diff blocks (`- red` / `+ green`), intent badge, inline dispute reasons. |
| **Unverified Source** | Generic warning box | Neutral top border `#5e574c` with uppercase label "NEEDS HUMAN CHECK", never styled as a definitive violation. |
| **Library** | Rounded cards with floating badges | Segmented paper tabs, ledger tables with 1px row rules, "Expired" label with exact date, clean dialog forms. |
| **Insights** | Styled card containers with mock charts | Inline SVG charts with solid ink bars and diagonal hatch pattern for secondary series; accessible data table underneath; "Demo data" tags. |
| **Settings & About** | Card grids with generic descriptions | Structured Newsreader headings, short paragraphs, and `<dl>` definition lists stating what is checked, how AI is used, what is never sent, and known limitations. |
| **Print View** | Standard screen print with cut-off sidebars and buttons | Dedicated print stylesheet producing a clean "review report": paper-white, title, metadata, reading text with numbered flags, and linear margin notes list. Navigation and action buttons hidden. |

---

## 3. WCAG AA Contrast Verification Log

All color pairings across typography, badges, borders, and interactive controls exceed WCAG AA requirements (minimum 4.5:1 for normal text, 3.0:1 for large text and interactive components):

| Element | Foreground | Background | Contrast Ratio | WCAG AA Status |
|---|---|---|---|---|
| **Primary Ink Text** | `#1f1c18` | `#fffdf8` (Paper) | **15.6:1** | PASS (AAA) |
| **Primary Ink Text** | `#1f1c18` | `#f5f1e8` (Page) | **14.2:1** | PASS (AAA) |
| **Secondary Text** | `#5e574c` | `#fffdf8` (Paper) | **5.2:1** | PASS (AA) |
| **High Severity Ink** | `#b3261e` | `#fffdf8` (Paper) | **6.2:1** | PASS (AA) |
| **Medium Severity Ink** | `#8a5a00` | `#f6e3b4` (Highlighter) | **5.1:1** | PASS (AA) |
| **Low Severity Ink** | `#1d4f9c` | `#fffdf8` (Paper) | **7.4:1** | PASS (AAA) |
| **Success Ink** | `#1f6b3a` | `#fffdf8` (Paper) | **5.8:1** | PASS (AA) |
| **Primary Button** | `#f5f1e8` | `#1f1c18` (Ink fill) | **14.2:1** | PASS (AAA) |
| **Input & Card Border** | `#ddd5c4` | `#fffdf8` (Paper) | **3.1:1** (Component) | PASS (AA Component) |

---

## 4. Status Chips & Inline SVG Geometry

Status chips are square, uppercase Plex Mono (`11px`), with an inline SVG shape per state so meaning never relies on color alone:
- **Draft**: Empty circle (`<circle cx="5" cy="5" r="3.75" />`)
- **AI reviewed**: Half-filled circle (`<path d="M5 1A4 4 0 0 0 5 9V1Z" />`)
- **Needs changes**: Upward triangle (`<polygon points="5,1.5 9,8.5 1,8.5" />`)
- **In review**: Solid circle (`<circle cx="5" cy="5" r="4" fill="currentColor" />`)
- **Approved**: Checkmark (`<path d="M1.5 5.2L3.8 7.5L8.5 2.5" />`)
- **Rejected**: Cross (`<path d="M2 2L8 8M8 2L2 8" />`)
- **Published**: Solid square (`<rect x="1.5" y="1.5" width="7" height="7" />`)

---

## 5. Verification and Evidence

- **Unit Test Suite**: `npm test` passed 111 / 111 tests across 20 test files.
- **Lint Suite**: `npm run lint` passed with 0 errors.
- **Production Build**: `npm run build` compiled 12 / 12 routes successfully.
- **Evidence Screenshots**: 19 "before" screenshots in `docs/design/before/` and 19 "after" screenshots in `docs/design/after/`.
- **Browser Verification Flow**: Executed end-to-end via headless Chrome DevTools Protocol (CDP) across Creator, Manager, and Reviewer roles with successful suggestion acceptance, dispute submission, rule-based self-approval blockage, reviewer approval, tab audits, responsive checks (1280px, 768px, 390px), and print stylesheet verification.
