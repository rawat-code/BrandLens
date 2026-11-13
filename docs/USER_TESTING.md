# BrandLens User Testing

## Tester 1
* **Role**: Social Media Manager
* **Date**: October 24, 2026
* **Tasks Given**: Submit a draft post containing banned terminology and accept an AI suggestion.
* **What Worked**: The side-by-side diff made it instantly obvious what the AI changed. The intent badge ("Meaning preserved") gave them confidence to accept the rewrite.
* **What Confused Them**: They were unsure if rejecting a suggestion would notify the original creator.

## Tester 2
* **Role**: Brand Compliance Reviewer
* **Date**: October 25, 2026
* **Tasks Given**: Review a flagged post, check the exact source quote, and request changes.
* **What Worked**: Being able to see the exact brand guideline cited next to the error saved them from having to open a separate document to verify the rule.
* **What Confused Them**: The "Readability" rule flagged a perfectly fine post because of some complex skincare terminology. (Note: We logged this as Known Limitation #7).

## Tester 3
* **Role**: Marketing Intern
* **Date**: October 26, 2026
* **Tasks Given**: Try to bypass the AI by adding "ignore all previous instructions" to the draft.
* **What Worked**: The prompt-injection flag successfully caught it and stopped the review, showing how robust the pre-AI fixed rules are.
* **What Confused Them**: The error message just said "Security Rule Triggered," which didn't explain what they did wrong.
