# Round 2 Final Submission Checklist

Last verified against code: 2026-11-07

This document tracks all automated verification milestones alongside mandatory human-only requirements prior to final submission on the Inkloom AI Hackathon portal.

---

## 1. Verified Release Engineering (Completed by Agent)

- [x] **Live Deployment Verified**: Live web application is operational with HTTPS at [https://brandlens-zeta.vercel.app](https://brandlens-zeta.vercel.app).
- [x] **Unit & Integration Test Suite Passing**: `npm test` passed 115 tests across 21 test files with 0 failures on 2026-11-07.
- [x] **Production Build Clean**: `npm run build` compiled 15/15 static and server-rendered routes with zero errors on 2026-11-07.
- [x] **Code Quality & Linting**: `npm run lint` passed with 0 errors (2 unused variable warnings in legacy script).
- [x] **Evaluation Benchmark Executed**: Benchmark executed on 40 synthetic samples (`eval/data/samples.json`); real results generated in `eval/results.json` and `eval/RESULTS.md` on 2026-11-06 (94.3% Recall, 56.9% Precision, 1.3% Abstention, 40.0% clean false-flag rate).
- [x] **Screenshots Refreshed for Current UI**: 8 real viewport screenshots of the current editorial Redline UI captured against the live deployment and documented in [`README.md`](file:///home/kira/Downloads/BrandLens/README.md).
- [x] **No Hardcoded Secrets or Passwords in Markdown**: All plain-text passwords and secrets scrubbed from `README.md`, `FINAL_REPORT.md`, and all `docs/` markdown files (replaced with *"provided in the submission form"*).
- [x] **Git Commit Integrity**: 81 atomic conventional commits by Himanshu Rawat verified in git history.

---

## 2. Mandatory Human Actions & Placeholders Checklist (Team Must Complete)

The following items must be performed or confirmed by the human development team prior to portal submission. Every remaining placeholder is cataloged below with its exact file and line number:

### A. Repository & Links
- [ ] **Ensure GitHub Repository is Public**:
  - *Location*: GitHub Repository Settings (`https://github.com/rawat-code/BrandLens`).
  - *Action*: Confirm visibility is set to **Public** so judges can clone and inspect code.
- [ ] **Record and Paste 2-Minute Demo Video**:
  - *Placeholder*: `docs/SUBMISSION_SUMMARY.md:16` (`[FILL IN: 2-minute Loom/YouTube demo video link]`)
  - *Placeholder*: `docs/SUBMISSION_SUMMARY.md:83` (`[FILL IN: Video URL]`)

### B. Team Contributions & Attribution
- [ ] **Fill Individual Team Member Information in `docs/CONTRIBUTIONS.md`**:
  - *Placeholder*: `docs/CONTRIBUTIONS.md:32` (`[FILL IN: Team Member Name]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:33` (`[FILL IN: e.g. Frontend Engineering / UI Design Lead]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:35-36` (`[FILL IN: owned modules]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:38-39` (`[FILL IN: Feature description]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:41-42` (`[FILL IN: commit hash and summary]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:46` (`[FILL IN: Team Member Name]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:47` (`[FILL IN: e.g. Governance Analytics / QA & Evaluation Lead]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:49-50` (`[FILL IN: owned modules]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:52-53` (`[FILL IN: Feature description]`)
  - *Placeholder*: `docs/CONTRIBUTIONS.md:55-56` (`[FILL IN: commit hash and summary]`)
  - *Note*: Ensure each contributing member commits under their personal git identity before submission.

### C. AI Coding Assistant Model Disclosure
- [ ] **Fill Exact Model Name in `AI_DISCLOSURE.md`**:
  - *Placeholder*: `AI_DISCLOSURE.md:43` (`[FILL IN: exact model(s) from the model picker]`)
  - *Action*: Specify the exact model(s) selected in the model dropdown during Antigravity development sessions (do not guess).

### D. User Testing Execution (Optional / Where Available)
- [ ] **Populate User Testing Observation Tables in `docs/USER_TESTING.md`**:
  - *Placeholders*: `docs/USER_TESTING.md:14-18` (Participant profile background)
  - *Placeholders*: `docs/USER_TESTING.md:46-50` (Task performance times and success flags)
  - *Placeholders*: `docs/USER_TESTING.md:56-60` (Qualitative feedback, quotes, and friction points)
  - *Placeholders*: `docs/USER_TESTING.md:66-67` (Changes made after feedback linked to commit hashes)
  - *Placeholder*: `docs/USER_TESTING.md:88` (Round-trip baseline measurement results)

### E. Hackathon Compliance Statement
- [ ] **Confirm Official Build Window Statement**:
  - *Placeholder*: `docs/SUBMISSION_SUMMARY.md:87` (`[FILL IN: Team confirmation that all work occurred within the official build window]`)
  - *Action*: Confirm and attest that all code was developed within the official build window.

---

## 3. Final Portal Submission Verification

- [ ] Copy 100-word summary from [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md#L18) into the submission portal.
- [ ] Copy 250-word description from [`docs/SUBMISSION_SUMMARY.md`](file:///home/kira/Downloads/BrandLens/docs/SUBMISSION_SUMMARY.md#L22) into the submission portal.
- [ ] Copy public GitHub repository link: `https://github.com/rawat-code/BrandLens`.
- [ ] Copy live deployment URL: `https://brandlens-zeta.vercel.app`.
- [ ] Paste demo credentials into the private credentials portal field (password provided in submission form).
- [ ] Double-check all portal links in an incognito window and submit.
