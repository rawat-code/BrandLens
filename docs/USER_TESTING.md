# User Testing Protocol & Results (Template)

Last verified against code: 2026-11-07

> **Documentation Integrity Notice**: Per workspace policy (`AGENTS.md`), user testing feedback, participant records, and survey findings must **never be fabricated**. This document provides the standardized protocol, script, consent agreement, and evaluation tables to be populated during live observational testing sessions with 3 to 5 real participants.

---

## 1. Tester Consent, Privacy & Background

### Participant Consent & Privacy Statement
*"All testing observations, task completion times, and qualitative feedback are recorded solely for evaluating the usability and governance efficacy of BrandLens for the Inkloom AI Hackathon. No personal identifying information, financial details, or corporate secrets will be stored or shared. You may stop or withdraw at any point."*

### Tester Profile & Background Information (Template)
- **Participant Identifier**: `[FILL IN: e.g. Tester P1]`
- **Professional Role / Experience**: `[FILL IN: e.g. Content Creator / Copywriter / Brand Manager / Legal Reviewer]`
- **Years of Experience in Content Review**: `[FILL IN]`
- **Familiarity with Brand Style Guides**: `[FILL IN: High / Moderate / Low]`
- **Date & Location of Session**: `[FILL IN: Date, Remote/In-Person]`

---

## 2. Facilitator Script & Tasks

Read the following instructions directly to the participant during the session:

### Pre-Test Briefing
*"Thank you for participating today. You will be evaluating BrandLens, a brand-governance review platform. In BrandLens, AI suggests revisions, but human creators and editors always retain control of approvals and edits. Please think out loud as you navigate each step."*

### 4 Prescribed Tasks
1. **Task 1: Draft Content**:
   - *Instruction*: Sign in as **Creator** (`creator@verdant.demo`). Create a new Instagram post containing a bold claim: *"Our miracle serum cures acne in 3 days!"*. Save the draft.
2. **Task 2: Execute Governance Review**:
   - *Instruction*: Click **Run review** to audit your text against the brand's library. Review the flagged findings, reading the reasons and inspecting the cited sources.
3. **Task 3: Evaluate Suggestions & Intent**:
   - *Instruction*: Inspect the suggested edit and its Intent badge (*"Meaning preserved"* vs *"Meaning may have changed"*). Click **Accept** on one suggestion, or click **Dispute** and submit a reason.
4. **Task 4: Submit for Workflow Approval**:
   - *Instruction*: Click **Submit for approval**. Verify that as a Creator, you cannot approve your own post, and observe the updated status.

### 3 Debrief Questions
1. *Did the cited guidelines, clinical facts, or terms make it immediately clear why each issue was flagged?*
2. *How easy was it to understand whether the AI's suggested fix preserved your original message and intent?*
3. *What was the most confusing, frustrating, or unexpected part of the workflow?*

---

## 3. Task Performance & Observational Results Log

*(To be filled by hand by the team following live sessions with 3 to 5 testers. Rows left as `[FILL IN]` per workspace policy.)*

| Participant ID | Task 1: Draft (Time / Success) | Task 2: Review (Time / Success) | Task 3: Suggestion (Time / Success) | Task 4: Submit (Time / Success) | Overall Ease (1-5) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `[FILL IN: P1]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P2]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P3]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P4]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P5]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |

---

## 4. Qualitative Feedback & Observations

| Participant ID | What Worked Well | What Confused Them / Pain Points | Specific Quotes |
| :--- | :--- | :--- | :--- |
| `[FILL IN: P1]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P2]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P3]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P4]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |
| `[FILL IN: P5]` | `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |

---

## 5. Changes Made After Feedback

*(To be filled after feedback is synthesized and code adjustments are committed.)*

| Feedback / Identified Pain Point | Resolution in BrandLens Code | Commit Hash | Verified Status |
| :--- | :--- | :--- | :---: |
| `[FILL IN: Issue description]` | `[FILL IN: Solution description]` | `[FILL IN: commit hash]` | `[FILL IN: Verified / Pending]` |
| `[FILL IN: Issue description]` | `[FILL IN: Solution description]` | `[FILL IN: commit hash]` | `[FILL IN: Verified / Pending]` |

---

## 6. Baseline-Measurement Protocol: Review Round-Trips

To measure the Round 1 target (*"fewer review round-trips than a measured baseline"*):

### Protocol Definition
1. **Definition of a Round-Trip**: A round-trip is defined as one complete cycle where content is submitted $\rightarrow$ reviewed $\rightarrow$ returned with change requests $\rightarrow$ revised by author $\rightarrow$ resubmitted.
2. **Baseline Measurement (Without BrandLens)**:
   - Provide 3 creators with 5 standard draft briefs.
   - Route drafts through conventional email/Slack reviews with a human compliance manager.
   - Count the average number of revision cycles required before final approval.
3. **Treatment Measurement (With BrandLens)**:
   - Provide the same or comparable drafts to authors using BrandLens.
   - Authors run pre-publication checks, resolve terminology and claim flags prior to initial submission, and submit to Manager.
   - Count the number of `needs_changes` transitions in `audit_log` before reaching `approved` status.
4. **Success Threshold**: BrandLens achieves a success if the average number of round-trips is reduced by $\ge 30\%$ compared to the measured baseline.
   - *Status*: `[FILL IN: Baseline average vs BrandLens average upon test execution]`.
