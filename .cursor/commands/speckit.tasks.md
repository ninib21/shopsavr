<!--
Sync Impact Report
------------------
Version change: n/a (new file)
Modified Principles: n/a
Added Sections: Full task tree by user story
Removed Sections: n/a
Templates updated: ✅ tasks-template.md
Follow-up TODOs: none
-->

# ShopSavr™ Task Plan

## Phase 1: Setup Tasks

- [ ] T001 Initialize Git repository and create `main` branch
- [ ] T002 Create folder structure (`src/`, `public/`, `contracts/`, `scripts/`)
- [ ] T003 Install dependencies per plan.md (React, Vite, Tailwind, Prisma, Express)
- [ ] T004 Set up ESLint, Prettier, and Git hooks in `.eslintrc.js`, `.prettierrc`
- [ ] T005 Create environment configuration system in `src/config/env.ts`
- [ ] T006 Configure basic Vite app shell in `src/main.tsx` and `src/App.tsx`
- [ ] T007 Initialize Prisma and setup database schema in `prisma/schema.prisma`
- [ ] T008 Setup Stripe & Cash App Pay credentials in `.env`
- [ ] T009 Create reusable UI component folder `src/components/ui/`
- [ ] T010 Add Tailwind base styles and branding tokens to `tailwind.config.js`

## Phase 2: Foundational Tasks

- [ ] T011 Create User entity in `src/models/user.ts`
- [ ] T012 Create Session/Auth middleware in `src/middleware/auth.ts`
- [ ] T013 Set up Firebase for push and auth fallback in `src/lib/firebase.ts`
- [ ] T014 [P] Create base layout with header/footer in `src/components/layout.tsx`
- [ ] T015 [P] Implement toast system in `src/components/ui/ToastProvider.tsx`

## Phase 3: [US1] Auto-Apply Coupon Engine

- [ ] T016 [US1] Define Coupon entity in `src/models/coupon.ts`
- [ ] T017 [P] [US1] Implement `CouponService` logic in `src/services/couponService.ts`
- [ ] T018 [P] [US1] Build REST endpoint `POST /apply-coupon` in `src/routes/coupon.ts`
- [ ] T019 [P] [US1] UI Form: Enter promo code + auto-apply UI in `src/pages/CouponPage.tsx`
- [ ] T020 [US1] Unit test coupon logic in `__tests__/couponService.test.ts`

## Phase 4: [US2] Receipt Scan & Price Match

- [ ] T021 [US2] Define Receipt entity in `src/models/receipt.ts`
- [ ] T022 [P] [US2] Implement OCR scan logic (e.g., Tesseract) in `src/services/receiptService.ts`
- [ ] T023 [P] [US2] Build UI drop zone for receipt upload in `src/pages/ReceiptScanPage.tsx`
- [ ] T024 [P] [US2] Implement REST endpoint `POST /scan-receipt` in `src/routes/receipt.ts`
- [ ] T025 [US2] Run test receipt flow with mock image in `__tests__/receipt.test.ts`

## Phase 5: [US3] Price Drop Alerts & History

- [ ] T026 [US3] Create PriceAlert entity in `src/models/priceAlert.ts`
- [ ] T027 [P] [US3] Background task: daily price check in `src/scripts/checkPrices.ts`
- [ ] T028 [P] [US3] UI page: Manage Alerts in `src/pages/PriceAlerts.tsx`
- [ ] T029 [US3] Endpoint: `GET /alerts`, `POST /alerts` in `src/routes/alerts.ts`

## Phase 6: [US4] Smart Shopping Assistant

- [ ] T030 [US4] Create SmartSearchService in `src/services/smartSearch.ts`
- [ ] T031 [P] [US4] Integrate popular APIs (e.g., Rakuten, Amazon, eBay) in `src/apis/providers.ts`
- [ ] T032 [P] [US4] Implement search UI in `src/pages/SmartSearch.tsx`
- [ ] T033 [US4] Render product cards with deal overlays from search results

## Phase 7: [US5] User Dashboard

- [ ] T034 [US5] Create dashboard route in `src/pages/Dashboard.tsx`
- [ ] T035 [P] [US5] Show savings chart, deals found, receipt log
- [ ] T036 [P] [US5] Add logout, account settings, and dark mode toggle
- [ ] T037 [US5] Render dynamic user-specific content via API calls

## Final Phase: Polish, Docs, and Launch

- [ ] T038 Add SEO metadata to `public/index.html` + social previews
- [ ] T039 Setup favicon, web manifest, and app icons
- [ ] T040 Optimize image load and compress static assets
- [ ] T041 Write docs in `docs/README.md`, `docs/quickstart.md`
- [ ] T042 Setup CI/CD deployment pipeline
- [ ] T043 Final MVP test: end-to-end happy path scenario

---

## Dependencies

```
US1: Auto-Apply Coupon Engine → US5: Dashboard
US2: Receipt Scan → US3: Price Alerts → US5: Dashboard
US4: Smart Search → US5: Dashboard
```

## Parallel Execution Opportunities

- T017/T018/T019 (Coupon logic/UI/API)
- T022/T023/T024 (Receipt scan logic/UI/API)
- T027/T028/T029 (Price alert background + UI)
- T031/T032 (Search integration)
- T035/T036 (Dashboard components)

## MVP Scope Suggestion

User Story 1: Coupon Entry + Auto-Apply Logic

```text
- T016 → T017 → T018 → T019 → T020
```

## Suggested Commit Message

```bash
git commit -m "tasks: scaffold actionable task list for ShopSavr MVP v1"