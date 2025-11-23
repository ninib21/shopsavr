---
description: Execute the ShopSavr™ implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.speckit/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. **Check checklist status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the `checklists/` directory
   - Count total, completed, and incomplete items per checklist
   - Generate a status table and determine overall project readiness
   - If incomplete items exist: Prompt the user to proceed or halt

3. Load and analyze implementation context:
   - **REQUIRED**: `tasks.md` for full task roadmap
   - **REQUIRED**: `plan.md` for ShopSavr™ tech stack and structure
   - **OPTIONAL**: Load data-model.md, contracts/, research.md, and quickstart.md if present

4. **Verify project setup**:
   - Ensure essential `.gitignore`, `.dockerignore`, `.eslintignore`, `.prettierignore`, `.npmignore` (if publishing), and other ignore files exist or are properly generated
   - Confirm patterns align with ShopSavr™'s stack (React 18, Next.js 14, TypeScript 5, TailwindCSS, Node.js/NestJS backend, Prisma ORM, PostgreSQL)

5. Parse `tasks.md` to extract:
   - Task phases: Setup, Core, Polish
   - Sequential and parallel [P] task dependencies
   - Exact task details with file paths

6. Execute ShopSavr™ implementation by phase:
   - **Setup Phase**: Scaffold folders, install dependencies, initialize project tools (e.g., pnpm, Prisma, ESLint, Prettier)
   - **Core Phase**: Implement all UI pages, frontend logic, backend APIs, DB schemas
     - Respect task dependencies strictly
     - Follow TDD if test tasks are defined
   - **Integration Phase**: Hook Stripe checkout, CashApp Pay, database, auth, notifications
   - **Polish Phase**: Clean UI/UX, finalize responsiveness, test in mobile/web, optimize code, document features

7. Execution rules:
   - Always start with foundational setup
   - Run all [P] parallelizable tasks together
   - Test-first when applicable (TDD-friendly dev)
   - Mark each task as `[X]` once complete

8. Track progress:
   - Output progress after each task
   - Halt on sequential failures
   - If any [P] task fails, continue others but report clearly
   - Offer suggestions for blocked items

9. Final validation:
   - Confirm all ShopSavr™ MVP tasks are done
   - Ensure landing page, mobile views, admin panel, and coupon logic meet specs
   - Test payment flows and UI interactions
   - Ensure deployment-readiness of frontend and backend

If `tasks.md` is missing, suggest running `/speckit.tasks` to regenerate the ShopSavr™ actionable plan.