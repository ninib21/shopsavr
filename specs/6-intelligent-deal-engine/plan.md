# Implementation Plan: ShopSavr™ - Intelligent Deal Engine

**Branch**: `6-intelligent-deal-engine` | **Date**: 2025-01-27 | **Spec**: `specs/6-intelligent-deal-engine/spec.md`  
**Input**: Feature specification from `/specs/6-intelligent-deal-engine/spec.md`

## Summary

ShopSavr™ Intelligent Deal Engine automates coupon discovery and application, receipt scanning with price matching, price drop alerts, and smart shopping assistance across browser extensions and mobile apps. The system aggregates deals from multiple sources, validates coupons in real-time, and provides users with the best savings opportunities without manual effort.

**Technical Approach**: Multi-platform architecture with React 18 + Vite 7 frontend, Node.js + Express backend, Prisma + PostgreSQL data layer, Redis caching, and integrations with Stripe, Cash App Pay, and Firebase for payments and notifications.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x, React 18.x  
**Primary Dependencies**: Express.js, Prisma ORM, React 18, Vite 7, TailwindCSS, Redis, Stripe SDK, Firebase SDK  
**Storage**: PostgreSQL 15+ (primary), Redis 7+ (caching), AWS S3 (receipt images)  
**Testing**: Jest, React Testing Library, Supertest, Playwright (E2E)  
**Target Platform**: 
- Web: Chrome 90+, Firefox 88+, Safari 14+ (browser extensions + responsive web)
- Mobile: iOS 15+, Android 10+ (native apps)
- Backend: Node.js on Linux (AWS/Docker)

**Project Type**: Multi-platform (web application + mobile apps + browser extensions)  
**Performance Goals**: 
- API response times: <200ms p95 for coupon validation
- Frontend load: <2s initial page load, <1s for subsequent navigations
- Receipt OCR: <5s processing time for standard receipts
- Price monitoring: Daily batch processing completes within 1 hour

**Constraints**: 
- Must maintain <2s response times for all API endpoints
- Receipt images limited to 10MB
- Must support offline queueing for mobile apps
- GDPR/CCPA compliance required for all user data
- PCI-DSS compliance for payment processing

**Scale/Scope**: 
- Target: 10,000 concurrent users at launch
- 50+ supported retailers for MVP
- 100,000+ coupon codes in database
- 1M+ receipt scans per month capacity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Principle 1: User-Centric Design** - Auto-apply functionality removes friction; simple UI for all tech levels  
✅ **Principle 2: Coupon Engine Integrity** - Real-time validation ensures accuracy; non-deceptive deal sourcing  
✅ **Principle 3: Frictionless Multi-Platform Use** - Browser extensions, iOS, Android, and web all supported  
✅ **Principle 4: Revenue without Exploitation** - Premium tiers and affiliate revenue; no data sales  
✅ **Principle 5: Universal Accessibility** - WCAG 2.1 AA compliance; multilingual support planned  
✅ **Principle 6: Security & Compliance First** - Encryption at rest/transit; GDPR/CCPA compliance  
✅ **Principle 7: Instantaneous Gratification** - Sub-2s response times; immediate coupon application feedback  
✅ **Principle 8: Feedback Loops** - User rating system for deals; broken code reporting  
✅ **Principle 9: Beautiful Efficiency** - Vibrant design with clean layout; performance-first approach

**Gates Review**:
- ✅ No missing IP protection
- ✅ Design language aligned with ShopSavr brand
- ✅ Monetization aligned with NPO/commercial strategy
- ✅ AI integration scoped (OCR for receipts, smart deal matching)

## Project Structure

### Documentation (this feature)

```text
specs/6-intelligent-deal-engine/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   ├── api-coupons.yaml
│   ├── api-receipts.yaml
│   ├── api-alerts.yaml
│   └── api-search.yaml
└── tasks.md             # Phase 2 output (to be generated)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/              # Prisma models (User, Deal, Coupon, Receipt, PriceAlert)
│   ├── services/            # Business logic
│   │   ├── couponService.ts
│   │   ├── receiptService.ts
│   │   ├── alertService.ts
│   │   └── searchService.ts
│   ├── api/                 # Express routes
│   │   ├── routes/
│   │   │   ├── coupons.ts
│   │   │   ├── receipts.ts
│   │   │   ├── alerts.ts
│   │   │   └── search.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       └── rateLimit.ts
│   ├── lib/                 # Utilities
│   │   ├── ocr.ts           # Receipt OCR integration
│   │   ├── redis.ts         # Cache client
│   │   └── validators.ts
│   └── scripts/             # Background jobs
│       └── priceMonitor.ts
├── prisma/
│   └── schema.prisma
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/

frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── CouponPage.tsx
│   │   ├── ReceiptScanPage.tsx
│   │   ├── PriceAlerts.tsx
│   │   └── SmartSearch.tsx
│   ├── services/            # API clients
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── hooks/               # React hooks
│   ├── lib/                 # Utilities
│   └── App.tsx
├── public/
└── tests/

extension/                   # Browser extension (Chrome/Firefox)
├── manifest.json
├── src/
│   ├── content/            # Content scripts
│   ├── background/         # Service worker
│   └── popup/              # Extension popup UI
└── tests/

mobile/                      # React Native app (iOS/Android)
├── ios/
├── android/
├── src/
│   ├── screens/
│   ├── components/
│   └── services/
└── tests/
```

**Structure Decision**: Multi-platform architecture with separate directories for backend, frontend web, browser extension, and mobile app. Shared business logic lives in backend services. Frontend, extension, and mobile consume the same REST API.

## Complexity Tracking

> **No Constitution violations identified. Architecture aligns with all principles.**

## Phase 0: Research & Technology Selection

### Research Areas

1. **Receipt OCR Solutions**
   - Decision: Use Tesseract.js for client-side OCR with server-side validation
   - Rationale: Balances privacy (client-side processing) with accuracy (server validation)
   - Alternatives: Google Cloud Vision API (cost), AWS Textract (vendor lock-in)

2. **Coupon Validation Strategy**
   - Decision: Real-time validation via retailer API when available, fallback to pattern matching
   - Rationale: Ensures accuracy while maintaining performance
   - Alternatives: Pre-validation only (stale data risk), manual verification (not scalable)

3. **Price Monitoring Architecture**
   - Decision: Daily batch jobs with Redis queue for scalability
   - Rationale: Efficient resource usage, can scale horizontally
   - Alternatives: Real-time monitoring (too expensive), weekly checks (too slow)

4. **Multi-Platform Code Sharing**
   - Decision: Shared API contracts, platform-specific UI implementations
   - Rationale: Maintains consistency while respecting platform conventions
   - Alternatives: Shared UI codebase (poor UX), completely separate (maintenance burden)

5. **Browser Extension Security**
   - Decision: Content script isolation with message passing, minimal permissions
   - Rationale: Security best practices, user trust
   - Alternatives: Full page access (security risk), no content scripts (limited functionality)

### Output → `research.md` (to be generated)

## Phase 1: Design & Contracts

### Data Model → `data-model.md` (to be generated)

**Core Entities**:
- `User`: id, email, authMethod, createdAt, preferences, paymentSettings
- `Deal`: id, title, type, source, url, expiry, tags, discountAmount, discountType
- `Coupon`: id, code, storeId, expiration, autoApplied, validationStatus, discountAmount
- `Receipt`: id, userId, imageUrl, extractedData (JSON), storeName, totalAmount, scannedAt
- `PriceAlert`: id, userId, productIdentifier, thresholdPrice, currentPrice, triggered, createdAt
- `SavingsRecord`: id, userId, dealId, couponId, amountSaved, timestamp, source

**Relationships**:
- User has many Receipts, PriceAlerts, SavingsRecords
- Deal has many Coupons
- Coupon belongs to Deal and Store
- Receipt can have many matched Deals

### API Contracts → `contracts/` (to be generated)

**Endpoints**:
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/coupons/available?store={storeId}` - Get available coupons for store
- `POST /api/coupons/apply` - Apply coupon code
- `POST /api/receipts/upload` - Upload receipt image
- `GET /api/receipts/{id}/matches` - Get price matches for receipt
- `POST /api/alerts` - Create price alert
- `GET /api/alerts` - List user's price alerts
- `DELETE /api/alerts/{id}` - Delete price alert
- `GET /api/search?q={query}` - Search for products/deals
- `GET /api/dashboard/stats` - Get user dashboard statistics

**Schema Format**: OpenAPI 3.1 YAML

### Quickstart Guide → `quickstart.md` (to be generated)

**Setup Steps**:
1. Clone repository
2. Install dependencies: `pnpm install`
3. Setup environment variables: Copy `.env.example` to `.env`
4. Initialize database: `pnpm prisma db push`
5. Seed test data: `pnpm prisma db seed`
6. Start backend: `pnpm dev:backend`
7. Start frontend: `pnpm dev:frontend`
8. Load extension: Load unpacked extension from `extension/` directory

## Phase 2: Implementation Strategy

### MVP Scope

**Phase 1 (Weeks 1-2)**: Core infrastructure
- Project setup, database schema, authentication
- Basic API structure and error handling

**Phase 2 (Weeks 3-4)**: Auto-apply coupon engine
- Coupon detection and validation
- Browser extension content script
- Auto-apply functionality

**Phase 3 (Weeks 5-6)**: Receipt scanning
- OCR integration
- Receipt upload and processing
- Price matching logic

**Phase 4 (Weeks 7-8)**: Price alerts
- Alert creation and management
- Background price monitoring
- Push notifications

**Phase 5 (Weeks 9-10)**: Smart search and dashboard
- Product search aggregation
- User dashboard
- Savings tracking

**Phase 6 (Weeks 11-12)**: Polish and launch
- Mobile app (iOS/Android)
- Performance optimization
- Security audit
- Documentation

### Risk Mitigation

1. **Coupon validation accuracy**: Implement fallback strategies, user feedback loop
2. **OCR accuracy**: Hybrid approach with manual review option
3. **API rate limits**: Implement caching and request queuing
4. **Multi-platform complexity**: Shared API contracts, platform-specific UI
5. **Performance at scale**: Redis caching, database indexing, CDN for static assets

## Success Metrics

- 95% coupon auto-apply success rate
- 90%+ receipt OCR accuracy
- <2s API response times (p95)
- 10,000 concurrent users supported
- 80% user retention after 30 days

