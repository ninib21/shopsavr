---

## description: Ask structured questions to de-risk ambiguous areas before planning the ShopSavr™ project.

## User Input

```text
$ARGUMENTS
```

## Outline

Goal: Detect and reduce ambiguity or missing decision points in the active ShopSavr™ feature specification and record the clarifications directly in the spec file.

> Note: This clarification workflow must run and complete **before** invoking `/speckit.plan`.

### Execution Steps:

#### Step 1: Prerequisite Validation

* Run: `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly`
* Parse output for:

  * `FEATURE_DIR`
  * `FEATURE_SPEC`
* If JSON parse fails, abort with guidance to re-run `/speckit.specify`.

#### Step 2: Coverage Scan (ShopSavr Context)

Perform structured ambiguity scan across the following areas and mark each:

* **Functional Scope & Behavior**: ✅ Clear
* **Domain & Data Model**: ⚠️ Partial (unclear on coupon struct, referral codes, promo cycles)
* **Interaction & UX Flow**: ⚠️ Partial (no detail on onboarding, coupon error states, reward popups)
* **Non-Functional Attributes**: ⚠️ Partial (performance & observability details missing)
* **Integrations & Dependencies**: ✅ Clear (Stripe, Cash App Pay, APIs defined)
* **Edge Cases & Failure Handling**: ⚠️ Missing (bad coupon, no network, out-of-stock)
* **Constraints & Tradeoffs**: ✅ Clear
* **Terminology**: ✅ Clear
* **Completion Signals**: ⚠️ Partial

#### Step 3: Clarification Queue (Top 5 Questions)

1. What happens if a user submits an invalid or expired coupon?
2. Is there a user rewards or loyalty system beyond single-use coupons?
3. What are the expected user states during onboarding and checkout (loading, error, empty)?
4. Are there performance SLAs for mobile/browser extensions (e.g., <200ms coupon injection)?
5. What observability tools or metrics are expected (logging, error tracking, usage heatmaps)?

#### Step 4: Questioning Loop

* One question asked at a time.
* Answers either:

  * Multiple choice with **recommended** option & table.
  * Short-form: **Suggested:** answer and user confirms or amends.
* Stop after:

  * 5 answers, or
  * User says "done" / "no more", or
  * No high-impact items remain.

#### Step 5: Clarification Integration

For each answer:

* Ensure `## Clarifications` > `### Session YYYY-MM-DD` exists in spec.
* Append: `- Q: ... → A: ...`
* Integrate:

  * Functional → `Functional Requirements`
  * Data → `Data Model`
  * UX → `User Stories` / `UX Flows`
  * NFR → `Non-Functional Requirements`
  * Errors → `Edge Cases` / `Fallbacks`
* Save immediately with atomic overwrite.

#### Step 6: Validation

* Max 5 answers
* No conflicting or vague terms remain
* Clarifications reflected in correct sections
* Terminology consistent
* Markdown headings untouched except:

  * `## Clarifications`
  * `### Session YYYY-MM-DD`

#### Step 7: Completion Report

* Questions asked/answered: (e.g., 4)
* File path: `FEATURE_SPEC`
* Sections touched: e.g., Functional Requirements, Data Model
* Summary table:

| Category                  | Status   |
| ------------------------- | -------- |
| Functional Scope          | Clear    |
| Domain & Data Model       | Resolved |
| Interaction & UX          | Resolved |
| Non-Functional Attributes | Resolved |
| Integration               | Clear    |
| Edge Cases / Failures     | Resolved |
| Constraints / Tradeoffs   | Clear    |
| Terminology / Consistency | Clear    |
| Completion Signals        | Deferred |

* Suggest next: `/speckit.plan`

---

Behavior:

* Never exceed 5 questions.
* Abort on environment or parse failure.
* Compact summary if full coverage present.
* Always format clean markdown for spec writing.
* Do not repeat resolved points.

Context for prioritization: ShopSavr coupon automation, edge cases, rewards UX, performance, observability, mobile responsiveness, referral codes, and user trustworthiness.
