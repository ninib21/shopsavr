# Tasks: ShopSavr™ - Intelligent Deal Engine

**Input**: Design documents from `/specs/6-intelligent-deal-engine/`  
**Prerequisites**: plan.md ✅, spec.md ✅  
**Branch**: `6-intelligent-deal-engine`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Phase 1: Setup & Infrastructure

**Purpose**: Project initialization and foundational structure

- [ ] T001 Initialize Git repository and create `main` branch
- [ ] T002 Create folder structure (`backend/`, `frontend/`, `extension/`, `mobile/`, `contracts/`, `scripts/`)
- [ ] T003 Install backend dependencies: Express, Prisma, TypeScript, Jest in `backend/`
- [ ] T004 Install frontend dependencies: React 18, Vite 7, TailwindCSS, TypeScript in `frontend/`
- [ ] T005 Set up ESLint, Prettier, and Git hooks (`.eslintrc.js`, `.prettierrc` in root)
- [ ] T006 Create environment configuration system in `backend/src/config/env.ts`
- [ ] T007 Initialize Prisma and setup database schema in `backend/prisma/schema.prisma`
- [ ] T008 Setup Stripe & Cash App Pay credentials in `.env.example` and `.env`
- [ ] T009 Create reusable UI component folder `frontend/src/components/ui/`
- [ ] T010 Add Tailwind base styles and branding tokens to `frontend/tailwind.config.js`
- [ ] T011 Configure Vite app shell in `frontend/src/main.tsx` and `frontend/src/App.tsx`
- [ ] T012 Setup Redis client in `backend/src/lib/redis.ts`
- [ ] T013 Configure Firebase SDK in `backend/src/lib/firebase.ts` and `frontend/src/lib/firebase.ts`

## Phase 2: Authentication & User Management

**Purpose**: Secure user authentication and session management

- [ ] T014 Create User entity model in `backend/prisma/schema.prisma`
- [ ] T015 Create Session/Auth middleware in `backend/src/api/middleware/auth.ts`
- [ ] T016 [P] Implement OAuth2/JWT authentication in `backend/src/services/authService.ts`
- [ ] T017 [P] Create auth routes: `POST /api/auth/signup`, `POST /api/auth/login` in `backend/src/api/routes/auth.ts`
- [ ] T018 [P] Build login/signup UI components in `frontend/src/components/auth/`
- [ ] T019 [P] Create base layout with header/footer in `frontend/src/components/layout/Layout.tsx`
- [ ] T020 [P] Implement toast notification system in `frontend/src/components/ui/ToastProvider.tsx`

## Phase 3: [US1] Auto-Apply Coupon Engine

**Purpose**: Automatically detect and apply best available coupons

- [ ] T021 [US1] Define Deal and Coupon entities in `backend/prisma/schema.prisma`
- [ ] T022 [US1] Create CouponService with validation logic in `backend/src/services/couponService.ts`
- [ ] T023 [P] [US1] Implement coupon detection algorithm in `backend/src/services/couponDetector.ts`
- [ ] T024 [P] [US1] Build REST endpoint `GET /api/coupons/available?store={storeId}` in `backend/src/api/routes/coupons.ts`
- [ ] T025 [P] [US1] Build REST endpoint `POST /api/coupons/apply` in `backend/src/api/routes/coupons.ts`
- [ ] T026 [P] [US1] Create coupon UI components in `frontend/src/components/features/CouponCard.tsx`
- [ ] T027 [P] [US1] Build coupon management page in `frontend/src/pages/CouponPage.tsx`
- [ ] T028 [US1] Create browser extension content script in `extension/src/content/couponInjector.ts`
- [ ] T029 [US1] Implement auto-apply logic in extension in `extension/src/content/autoApply.ts`
- [ ] T030 [US1] Create extension popup UI in `extension/src/popup/Popup.tsx`
- [ ] T031 [US1] Unit test coupon logic in `backend/tests/unit/couponService.test.ts`
- [ ] T032 [US1] Integration test coupon API in `backend/tests/integration/coupons.test.ts`

## Phase 4: [US2] Receipt Scanning & Price Matching

**Purpose**: Extract receipt data and find better prices

- [ ] T033 [US2] Define Receipt entity in `backend/prisma/schema.prisma`
- [ ] T034 [US2] Integrate Tesseract.js OCR in `backend/src/lib/ocr.ts`
- [ ] T035 [P] [US2] Implement receipt parsing service in `backend/src/services/receiptService.ts`
- [ ] T036 [P] [US2] Create price matching service in `backend/src/services/priceMatcher.ts`
- [ ] T037 [P] [US2] Build REST endpoint `POST /api/receipts/upload` in `backend/src/api/routes/receipts.ts`
- [ ] T038 [P] [US2] Build REST endpoint `GET /api/receipts/{id}/matches` in `backend/src/api/routes/receipts.ts`
- [ ] T039 [P] [US2] Create receipt upload UI with drag-drop in `frontend/src/components/features/ReceiptUpload.tsx`
- [ ] T040 [P] [US2] Build receipt scan page in `frontend/src/pages/ReceiptScanPage.tsx`
- [ ] T041 [P] [US2] Create price match results display in `frontend/src/components/features/PriceMatchResults.tsx`
- [ ] T042 [US2] Setup AWS S3 for receipt image storage in `backend/src/lib/s3.ts`
- [ ] T043 [US2] Unit test receipt parsing in `backend/tests/unit/receiptService.test.ts`
- [ ] T044 [US2] Integration test receipt API in `backend/tests/integration/receipts.test.ts`

## Phase 5: [US3] Price Drop Alerts & History

**Purpose**: Monitor prices and notify users of drops

- [ ] T045 [US3] Create PriceAlert entity in `backend/prisma/schema.prisma`
- [ ] T046 [US3] Create SavingsRecord entity in `backend/prisma/schema.prisma`
- [ ] T047 [US3] Implement alert service in `backend/src/services/alertService.ts`
- [ ] T048 [P] [US3] Create background price monitoring script in `backend/src/scripts/priceMonitor.ts`
- [ ] T049 [P] [US3] Setup Redis queue for price checks in `backend/src/lib/priceQueue.ts`
- [ ] T050 [P] [US3] Build REST endpoint `POST /api/alerts` in `backend/src/api/routes/alerts.ts`
- [ ] T051 [P] [US3] Build REST endpoint `GET /api/alerts` in `backend/src/api/routes/alerts.ts`
- [ ] T052 [P] [US3] Build REST endpoint `DELETE /api/alerts/{id}` in `backend/src/api/routes/alerts.ts`
- [ ] T053 [P] [US3] Create price alert UI page in `frontend/src/pages/PriceAlerts.tsx`
- [ ] T054 [P] [US3] Implement alert creation form in `frontend/src/components/features/AlertForm.tsx`
- [ ] T055 [P] [US3] Integrate Firebase push notifications in `backend/src/services/notificationService.ts`
- [ ] T056 [US3] Unit test alert service in `backend/tests/unit/alertService.test.ts`
- [ ] T057 [US3] Integration test alert API in `backend/tests/integration/alerts.test.ts`

## Phase 6: [US4] Smart Shopping Assistant

**Purpose**: Aggregate deals from multiple sources

- [ ] T058 [US4] Create SmartSearchService in `backend/src/services/searchService.ts`
- [ ] T059 [P] [US4] Integrate Rakuten API in `backend/src/lib/apis/rakuten.ts`
- [ ] T060 [P] [US4] Create affiliate network integrations in `backend/src/lib/apis/affiliates.ts`
- [ ] T061 [P] [US4] Implement deal aggregation logic in `backend/src/services/dealAggregator.ts`
- [ ] T062 [P] [US4] Build REST endpoint `GET /api/search?q={query}` in `backend/src/api/routes/search.ts`
- [ ] T063 [P] [US4] Create search UI component in `frontend/src/components/features/SearchBar.tsx`
- [ ] T064 [P] [US4] Build smart search page in `frontend/src/pages/SmartSearch.tsx`
- [ ] T065 [P] [US4] Create product card component with deal overlays in `frontend/src/components/features/ProductCard.tsx`
- [ ] T066 [US4] Unit test search service in `backend/tests/unit/searchService.test.ts`
- [ ] T067 [US4] Integration test search API in `backend/tests/integration/search.test.ts`

## Phase 7: [US5] User Dashboard & Savings Tracking

**Purpose**: Centralized user experience and savings visibility

- [ ] T068 [US5] Create dashboard stats service in `backend/src/services/dashboardService.ts`
- [ ] T069 [P] [US5] Build REST endpoint `GET /api/dashboard/stats` in `backend/src/api/routes/dashboard.ts`
- [ ] T070 [P] [US5] Create dashboard page in `frontend/src/pages/Dashboard.tsx`
- [ ] T071 [P] [US5] Build savings chart component in `frontend/src/components/features/SavingsChart.tsx`
- [ ] T072 [P] [US5] Create deal history component in `frontend/src/components/features/DealHistory.tsx`
- [ ] T073 [P] [US5] Build account settings page in `frontend/src/pages/Settings.tsx`
- [ ] T074 [P] [US5] Implement dark mode toggle in `frontend/src/components/ui/ThemeToggle.tsx`
- [ ] T075 [US5] Unit test dashboard service in `backend/tests/unit/dashboardService.test.ts`

## Phase 8: Mobile App Development

**Purpose**: Native iOS and Android applications

- [ ] T076 Initialize React Native project in `mobile/`
- [ ] T077 [P] Setup iOS project structure in `mobile/ios/`
- [ ] T078 [P] Setup Android project structure in `mobile/android/`
- [ ] T079 [P] Create shared mobile components in `mobile/src/components/`
- [ ] T080 [P] Implement mobile navigation in `mobile/src/navigation/`
- [ ] T081 [P] Create mobile screens (Dashboard, Coupons, Receipts, Alerts, Search) in `mobile/src/screens/`
- [ ] T082 [P] Integrate mobile API client in `mobile/src/services/api.ts`
- [ ] T083 [P] Setup push notifications for iOS in `mobile/ios/`
- [ ] T084 [P] Setup push notifications for Android in `mobile/android/`
- [ ] T085 [P] Implement offline queueing in `mobile/src/lib/offlineQueue.ts`
- [ ] T086 Test mobile app on iOS simulator
- [ ] T087 Test mobile app on Android emulator

## Phase 9: Polish, Security & Performance

**Purpose**: Production readiness

- [ ] T088 Add SEO metadata to `frontend/public/index.html` + social previews
- [ ] T089 Setup favicon, web manifest, and app icons
- [ ] T090 Optimize image loading and compress static assets
- [ ] T091 Implement rate limiting middleware in `backend/src/api/middleware/rateLimit.ts`
- [ ] T092 Add input validation and sanitization in `backend/src/lib/validators.ts`
- [ ] T093 Setup CORS configuration in `backend/src/api/middleware/cors.ts`
- [ ] T094 Implement error handling and logging in `backend/src/lib/logger.ts`
- [ ] T095 Add database indexes for performance in `backend/prisma/schema.prisma`
- [ ] T096 Setup CDN for static assets
- [ ] T097 Write API documentation in `docs/api.md`
- [ ] T098 Write developer quickstart guide in `docs/quickstart.md`
- [ ] T099 Write user documentation in `docs/user-guide.md`

## Phase 10: Testing & Quality Assurance

**Purpose**: Comprehensive testing coverage

- [ ] T100 Setup E2E testing with Playwright in `tests/e2e/`
- [ ] T101 Create E2E test for coupon auto-apply flow
- [ ] T102 Create E2E test for receipt upload and price matching
- [ ] T103 Create E2E test for price alert creation and notification
- [ ] T104 Create E2E test for product search and deal aggregation
- [ ] T105 Setup CI/CD pipeline (GitHub Actions)
- [ ] T106 Add unit test coverage reporting
- [ ] T107 Perform security audit (dependencies, code)
- [ ] T108 Load testing with 10K concurrent users
- [ ] T109 Accessibility testing (WCAG 2.1 AA compliance)
- [ ] T110 Cross-browser testing (Chrome, Firefox, Safari)

## Phase 11: Deployment & Launch

**Purpose**: Production deployment

- [ ] T111 Setup production database (PostgreSQL on AWS RDS)
- [ ] T112 Setup production Redis instance
- [ ] T113 Configure production environment variables
- [ ] T114 Deploy backend API (AWS ECS/Docker)
- [ ] T115 Deploy frontend web app (AWS S3 + CloudFront)
- [ ] T116 Publish browser extension to Chrome Web Store
- [ ] T117 Publish browser extension to Firefox Add-ons
- [ ] T118 Submit iOS app to App Store (TestFlight)
- [ ] T119 Submit Android app to Google Play Store
- [ ] T120 Setup monitoring and alerting (Sentry, Firebase Performance)
- [ ] T121 Create launch announcement and marketing materials

---

## Dependencies

```
T001 → T002 → T003-T013 (Setup)
T014-T020 → T021-T032 (Auth → Coupons)
T014-T020 → T033-T044 (Auth → Receipts)
T014-T020 → T045-T057 (Auth → Alerts)
T014-T020 → T058-T067 (Auth → Search)
T014-T020 → T068-T075 (Auth → Dashboard)
T076-T087 (Mobile - can start after T014-T020)
T088-T099 (Polish - can run in parallel with testing)
T100-T110 (Testing - runs alongside development)
T111-T121 (Deployment - after all features complete)
```

## Parallel Execution Opportunities

- T016/T017/T018/T019/T020 (Auth services, routes, UI components)
- T023/T024/T025/T026/T027 (Coupon detection, API, UI)
- T035/T036/T037/T038/T039/T040/T041 (Receipt services, API, UI)
- T048/T049/T050/T051/T052/T053/T054 (Alert background jobs, API, UI)
- T059/T060/T061/T062/T063/T064/T065 (Search integrations, API, UI)
- T069/T070/T071/T072/T073/T074 (Dashboard API, components)
- T077/T078 (iOS/Android setup)
- T081/T082/T083/T084 (Mobile screens, API, notifications)

## MVP Scope Suggestion

**Minimum Viable Product (Weeks 1-8)**:

Focus on User Story 1 (Auto-Apply Coupons) + basic auth:
- T001 → T032 (Setup + Auth + Coupon Engine)
- Browser extension only (no mobile app initially)
- Basic dashboard (savings count only)

This delivers core value: automatic coupon application.

## Suggested Commit Message

```bash
git commit -m "tasks: scaffold actionable task list for ShopSavr Intelligent Deal Engine MVP"
```

