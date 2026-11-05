# User Testing Report Template (BrandLens)

> **Documentation Integrity Notice**: Per workspace policy (`AGENTS.md`), user testing feedback, participant records, and evaluation findings must never be fabricated. This document is provided as a clean, standardized evaluation template to be populated solely through live observational testing sessions with real human participants.

---

## 1. Study Overview

- **Test Cohort**: [Target number of participants, e.g., 4 creators, 2 reviewers/managers]
- **Environment**: Staging / Production deployment (`https://brandlens.vercel.app` or local instance)
- **Facilitator**: [Facilitator Name / Role]
- **Date Range**: [Testing Dates]
- **Evaluation Objectives**:
  1. Measure usability of the brand-governance review workflow from draft submission to review.
  2. Evaluate clarity and utility of the "No Source, No Flag" citations and suggestion diffs.
  3. Validate human decision-making ergonomics (Accept, Edit then accept, Dispute, Dismiss).
  4. Test manager/reviewer approval controls and prevention of self-approval.

---

## 2. Participant Profiles

| Participant ID | Role / Background | Content Channels | Skincare Domain Knowledge |
| :--- | :--- | :--- | :--- |
| **P-01** | [Creator / Social Copywriter] | Instagram, Threads | [Novice / Intermediate / Advanced] |
| **P-02** | [Creator / Long-form Writer] | Blog, Email Newsletters | [Novice / Intermediate / Advanced] |
| **P-03** | [Brand Reviewer / Legal Specialist] | All Channels | [Expert] |
| **P-04** | [Marketing Manager / Admin] | Omnichannel Strategy | [Expert] |

---

## 3. Test Scenarios & Task Protocols

### Scenario A: Creator Draft Submission & Review
- **Task 1**: Sign in as `creator@verdant.demo`.
- **Task 2**: Create a new draft containing an unsupported clinical claim (e.g. "99% cure in 3 days").
- **Task 3**: Run the governance review engine.
- **Task 4**: Inspect flagged findings and review the cited library sources.
- **Task 5**: Accept or dispute a suggestion and observe version creation.
- **Task 6**: Submit content for approval.

### Scenario B: Reviewer Triage & Approval Gate
- **Task 1**: Sign in as `reviewer@verdant.demo` or `manager@verdant.demo`.
- **Task 2**: Locate submitted content with open findings.
- **Task 3**: Attempt to approve content with open high-severity findings (verify blocking gate).
- **Task 4**: Review creator dispute reasons and provide reviewer comments.
- **Task 5**: Request changes or grant final approval.

### Scenario C: Admin Library & Insights Governance
- **Task 1**: Sign in as `admin@verdant.demo`.
- **Task 2**: Navigate to `/insights` and inspect the Guideline Health rankings.
- **Task 3**: Generate an AI clarification proposal for a frequently disputed guideline.
- **Task 4**: Review the proposal and accept/reject it.

---

## 4. Observational Results & Metrics

| Participant | Task Completion Rate | Time on Task (min) | Ease of Use (1-5) | Notes / Friction Points |
| :--- | :--- | :--- | :--- | :--- |
| **P-01** | [To be filled] | [To be filled] | [ ] | [Observational notes] |
| **P-02** | [To be filled] | [To be filled] | [ ] | [Observational notes] |
| **P-03** | [To be filled] | [To be filled] | [ ] | [Observational notes] |
| **P-04** | [To be filled] | [To be filled] | [ ] | [Observational notes] |

---

## 5. Qualitative Feedback & Key Insights

### Clarity of Citations ("No Source, No Flag")
- *Observed Strengths*: [To be filled during live sessions]
- *Observed Weaknesses / Ambiguities*: [To be filled during live sessions]

### Suggestion Block Usability (Side-by-side Diffs & Intent Badges)
- *Observed Strengths*: [To be filled during live sessions]
- *Observed Weaknesses / Ambiguities*: [To be filled during live sessions]

### Governance Guardrails & Permission Controls
- *Observed Strengths*: [To be filled during live sessions]
- *Observed Weaknesses / Ambiguities*: [To be filled during live sessions]

---

## 6. Actionable Iterations & Recommendations

| Priority | Issue / Finding | Recommended Adjustment | Status |
| :--- | :--- | :--- | :--- |
| **High** | [Issue description] | [Proposed UI/Logic change] | Pending |
| **Medium** | [Issue description] | [Proposed UI/Logic change] | Pending |
| **Low** | [Issue description] | [Proposed UI/Logic change] | Pending |
