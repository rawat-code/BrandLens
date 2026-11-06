# BrandLens: Final Submission Checklist

This checklist tracks completion of automated release engineering alongside mandatory human-only requirements prior to final portal submission.

---

## 1. Automated Engineering & Release Verification (Completed by Agent)

- [x] **Branch Merged to `main`**: All features, hardening, and test suites merged into `main` without conflicts.
- [x] **Pushed to Remote**: Latest commit pushed to `origin/main`.
- [x] **Live Deployment Verified**: Live URL [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app) operational, responsive, with neutral branding and demo indicators.
- [x] **All Tests & Builds Passing**:
  - `npm run lint`: 0 errors, 0 warnings
  - `npm test`: 111 / 111 unit & integration tests passing across 20 test files
  - `npm run build`: 12/12 routes compiled cleanly
- [x] **Production Smoke Test Passed**: Automated end-to-end verification executed on live deployment across all 7 steps (Creator submission, 10 rule catches, suggestion accept v1->v2, separation-of-duties block, manager approval gating on `requires_reviewer`, tabs & telemetry, `/insights` RBAC).
- [x] **Production Data Cleaned & Reset**: Purged test junk via `scripts/reset-demo.ts --confirm` and restored clean canonical baseline data (guidelines, facts, terms, and showcases A–E) via `npm run seed`. Verified live Creator studio.
- [x] **Submission Pack Prepared**: [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md) compiled with product overview, 100-word summary, architecture, security policies, and demo credentials.

---

## 2. Mandatory Human Actions (Team Must Do Before Submission)

Per the workspace policy (`AGENTS.md`), the following items must **NEVER** be fabricated by AI and must be completed by the team:

- [ ] **Make GitHub Repository Public**:
  - Navigate to repository settings on GitHub (`https://github.com/rawat-code/BrandLens`).
  - Change visibility from Private to **Public** so judges and evaluators can clone and inspect the source code.
- [ ] **Conduct Real User Testing (3 to 5 People)**:
  - Facilitate live testing sessions using the script in [`docs/USER_TESTING.md`](file:///home/kira/Downloads/BrandLens/docs/USER_TESTING.md).
  - Fill in the 5 participant feedback rows (What Worked, What Confused Them, Changes Made).
- [ ] **Fill Individual Team Contributions**:
  - Open [`docs/CONTRIBUTIONS.md`](file:///home/kira/Downloads/BrandLens/docs/CONTRIBUTIONS.md).
  - Fill in each team member's name, role, owned modules, major features, and key commit hashes.
- [ ] **Disclose Antigravity AI Model(s)**:
  - Fill in the exact model(s) selected in the model picker during development in:
    - [`AI_DISCLOSURE.md`](file:///home/kira/Downloads/BrandLens/AI_DISCLOSURE.md) (line 41)
    - [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md) (Section 7)
- [ ] **Record and Link 2-Minute Demo Video**:
  - Record a concise 2-minute walkthrough showing Creator drafting, running review, accepting a fix, and manager approval gating.
  - Paste the Loom/YouTube link into [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md) (Section 9).
- [ ] **Submit on Hackathon Portal**:
  - Copy fields from [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md) into the Inkloom AI Hackathon submission form.
  - Verify live links and submit before the portal deadline.
