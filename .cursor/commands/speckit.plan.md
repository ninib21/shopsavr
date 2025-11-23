---

## description: Execute the implementation planning workflow using the plan template to generate design artifacts for ShopSavr™.

## User Input

```text
ShopSavr™ - Intelligent Coupon & Deal Finder App
```

## Outline

1. **Setup**:

   * Run `.specify/scripts/powershell/setup-plan.ps1 -Json` from the repo root.
   * Parse JSON for:

     * FEATURE_SPEC: `/specs/shopsavr/spec.md`
     * IMPL_PLAN: `/specs/shopsavr/plan.md`
     * SPECS_DIR: `/specs/shopsavr/`
     * BRANCH: `6-intelligent-deal-engine`

2. **Load context**:

   * Read `spec.md` for the full ShopSavr™ feature spec.
   * Read `.specify/memory/constitution.md` for the project rules.
   * Load IMPL_PLAN template structure.

3. **Execute plan workflow**:

   * Fill Technical Context (see below)
   * Fill Constitution Check from `.specify/memory/constitution.md`
   * Evaluate gates
   * Phase 0 → `research.md`
   * Phase 1 → `data-model.md`, `contracts/`, `quickstart.md`
   * Run agent context updater script
   * Re-check Constitution after Phase 1

4. **Stop and report**: Provide branch, IMPL_PLAN path, generated artifacts

## Technical Context (ShopSavr™)

* **Frontend**: React 18 + Vite 7 (web + mobile)
* **Backend**: Node.js + Express (APIs)
* **Data Layer**: Prisma + PostgreSQL
* **Cache**: Redis (discount sync)
* **Extensions**: Browser plug-ins (Chrome, Firefox)
* **App**: iOS (TestFlight), Android (APK)
* **Integration**:

  * Stripe for payments
  * Cash App Pay
  * Firebase Analytics
  * Firebase Notifications
* **Security**: OAuth2 + JWT, Rate limiting, CAPTCHA, HTTPS
* **Monitoring**: Sentry + Firebase Performance
* **Storage**: AWS S3 (receipt uploads)

## Constitution Check

✅ App respects:

* Global compliance: GDPR, CCPA
* Monetization clarity
* NPO governance and pricing transparency
* Accessibility and multilingual options

## Gates Review

* ✅ No missing IP protection
* ✅ Design language locked
* ✅ Monetization aligned with NPO/commercial strategy
* ✅ AI integration scoped

---

## Phase 0: Outline & Research

### Tasks

* Research "receipt parsing best practices"
* Research "multi-platform coupon autofill tech"
* Research "real-time price tracker architecture"
* Best practices for Cash App Pay integration
* Browser extension data access security standards

### Output → `research.md`

Each entry contains:

* **Decision**
* **Rationale**
* **Alternatives considered**

---

## Phase 1: Design & Contracts

### `data-model.md`

* Entities:

  * `User`: id, email, auth method, payment settings
  * `Deal`: id, title, type, source, url, expiry, tags
  * `Coupon`: id, code, store, expiration, auto_applied
  * `Receipt`: id, userId, image_url, extracted_data
  * `PriceAlert`: id, item, userId, threshold, triggered

### `/contracts/` (API Interfaces)

* `POST /api/user/signup`
* `GET /api/deals` → returns relevant real-time deals
* `POST /api/coupons/apply`
* `POST /api/receipts/upload`
* `POST /api/alerts/set`

Schema output in OpenAPI 3.1 format

### `quickstart.md`

* Install instructions for contributors
* Dev setup with `.env`, `pnpm install`, `prisma db push`, `vite dev`
* Extension dev mode tips

### Agent Context Update

* Run:

  ```powershell
  .specify/scripts/powershell/update-agent-context.ps1 -AgentType cursor-agent
  ```
* Added:

  * Prisma ORM
  * Browser extension sandboxing
  * Receipt image OCR

---

## Output Summary

* Branch: `6-intelligent-deal-engine`
* Plan path: `/specs/shopsavr/plan.md`
* Artifacts:

  * `research.md`
  * `data-model.md`
  * `/contracts/*.yaml`
  * `quickstart.md`
  * `agent-context-update.log`

Ready for `/speckit.design`, `/speckit.build`, or `/speckit.test` phases.
