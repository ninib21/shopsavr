# ShopSavr™ Dependencies

**Last Updated**: 2025-01-27  
**Package Manager**: pnpm  
**Node Version**: >=20.0.0

---

## 📦 Backend Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@prisma/client** | ^5.9.1 | PostgreSQL ORM client |
| **express** | ^4.18.2 | Web framework |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing |
| **helmet** | ^7.1.0 | Security headers middleware |
| **dotenv** | ^16.4.1 | Environment variable management |
| **jsonwebtoken** | ^9.0.2 | JWT authentication tokens |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **redis** | ^4.6.13 | Redis client for caching |
| **firebase-admin** | ^12.0.0 | Firebase Admin SDK (push notifications) |
| **stripe** | ^14.21.0 | Stripe payment processing |
| **tesseract.js** | ^5.0.4 | OCR for receipt scanning |
| **aws-sdk** | ^2.1529.0 | AWS services (S3 for receipt storage) |
| **zod** | ^3.22.4 | Schema validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@types/express** | ^4.17.21 | TypeScript types for Express |
| **@types/cors** | ^2.8.17 | TypeScript types for CORS |
| **@types/jsonwebtoken** | ^9.0.5 | TypeScript types for JWT |
| **@types/bcryptjs** | ^2.4.6 | TypeScript types for bcrypt |
| **@types/node** | ^20.11.16 | TypeScript types for Node.js |
| **@types/jest** | ^29.5.11 | TypeScript types for Jest |
| **prisma** | ^5.9.1 | Prisma CLI and code generation |
| **tsx** | ^4.7.1 | TypeScript execution (dev server) |
| **typescript** | ^5.3.3 | TypeScript compiler |
| **jest** | ^29.7.0 | Testing framework |
| **ts-jest** | ^29.1.2 | TypeScript preset for Jest |
| **supertest** | ^6.3.4 | HTTP assertion library for testing |
| **@types/supertest** | ^6.0.2 | TypeScript types for Supertest |

---

## 🎨 Frontend Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **react** | ^18.2.0 | React UI library |
| **react-dom** | ^18.2.0 | React DOM renderer |
| **react-router-dom** | ^6.22.0 | Client-side routing |
| **axios** | ^1.6.7 | HTTP client for API calls |
| **firebase** | ^10.8.0 | Firebase Client SDK |
| **zustand** | ^4.5.0 | State management |
| **react-query** | ^3.39.3 | Server state management & caching |
| **react-hook-form** | ^7.50.1 | Form handling |
| **zod** | ^3.22.4 | Schema validation (forms) |
| **@hookform/resolvers** | ^3.3.4 | Zod resolver for react-hook-form |
| **react-hot-toast** | ^2.4.1 | Toast notifications |
| **recharts** | ^2.10.4 | Chart library for dashboard |
| **date-fns** | ^3.3.1 | Date utility library |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@types/react** | ^18.2.55 | TypeScript types for React |
| **@types/react-dom** | ^18.2.19 | TypeScript types for React DOM |
| **@vitejs/plugin-react** | ^4.2.1 | Vite plugin for React |
| **vite** | ^7.0.0 | Build tool and dev server |
| **typescript** | ^5.3.3 | TypeScript compiler |
| **tailwindcss** | ^3.4.1 | Utility-first CSS framework |
| **postcss** | ^8.4.35 | CSS post-processor |
| **autoprefixer** | ^10.4.17 | CSS vendor prefixing |
| **vitest** | ^1.2.2 | Testing framework (Vite-native) |
| **@testing-library/react** | ^14.1.2 | React testing utilities |
| **@testing-library/jest-dom** | ^6.1.6 | Jest DOM matchers |
| **@testing-library/user-event** | ^14.5.1 | User interaction simulation |
| **jsdom** | ^23.2.0 | DOM implementation for testing |

---

## 🔧 Root Workspace Dependencies

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@typescript-eslint/eslint-plugin** | ^6.21.0 | ESLint plugin for TypeScript |
| **@typescript-eslint/parser** | ^6.21.0 | ESLint parser for TypeScript |
| **eslint** | ^8.56.0 | JavaScript/TypeScript linter |
| **eslint-config-prettier** | ^9.1.0 | Prettier integration for ESLint |
| **prettier** | ^3.2.5 | Code formatter |
| **typescript** | ^5.3.3 | TypeScript compiler (shared) |

---

## 📊 Dependency Categories

### Backend Categories

**Core Framework:**
- Express (web server)
- TypeScript (language)

**Database & ORM:**
- Prisma (ORM)
- PostgreSQL (via Prisma)

**Authentication & Security:**
- jsonwebtoken (JWT tokens)
- bcryptjs (password hashing)
- helmet (security headers)
- zod (input validation)

**Caching & Storage:**
- Redis (caching)
- AWS SDK (S3 storage)

**Third-Party Integrations:**
- Stripe (payments)
- Firebase Admin (push notifications)

**Utilities:**
- dotenv (environment variables)
- cors (CORS handling)
- tesseract.js (OCR)

**Testing:**
- Jest (test framework)
- ts-jest (TypeScript support)
- Supertest (API testing)

---

### Frontend Categories

**Core Framework:**
- React 18 (UI library)
- TypeScript (language)
- Vite 7 (build tool)

**Routing:**
- React Router DOM (client-side routing)

**State Management:**
- Zustand (client state)
- React Query (server state)

**Forms & Validation:**
- React Hook Form (form handling)
- Zod (schema validation)

**UI & Styling:**
- TailwindCSS (utility CSS)
- PostCSS (CSS processing)
- Autoprefixer (vendor prefixes)

**Data Visualization:**
- Recharts (charts/graphs)

**Utilities:**
- Axios (HTTP client)
- Firebase (client SDK)
- React Hot Toast (notifications)
- date-fns (date utilities)

**Testing:**
- Vitest (test framework)
- React Testing Library (component testing)
- jsdom (DOM simulation)

---

## 🔍 Key Technology Stack Summary

### Backend Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis 4.6
- **Auth**: JWT + bcrypt
- **Payments**: Stripe
- **Storage**: AWS S3
- **Notifications**: Firebase Admin
- **OCR**: Tesseract.js

### Frontend Stack
- **Framework**: React 18.2
- **Language**: TypeScript 5.3
- **Build Tool**: Vite 7.0
- **Styling**: TailwindCSS 3.4
- **Routing**: React Router 6.22
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios
- **Charts**: Recharts
- **Notifications**: React Hot Toast

---

## 📦 Installation

### Install All Dependencies

```bash
# From project root
pnpm install
```

This will install dependencies for:
- Root workspace
- Backend (`backend/`)
- Frontend (`frontend/`)
- Extension (`extension/`) - when created
- Mobile (`mobile/`) - when created

### Install Individual Workspaces

```bash
# Backend only
pnpm --filter backend install

# Frontend only
pnpm --filter frontend install
```

---

## 🔄 Dependency Updates

### Check for Updates
```bash
# Check outdated packages
pnpm outdated

# Update all dependencies
pnpm update
```

### Security Audit
```bash
# Audit dependencies
pnpm audit

# Fix vulnerabilities
pnpm audit fix
```

---

## 📝 Notes

- All packages use **caret (^) versioning** for automatic patch/minor updates
- **TypeScript 5.3** is used across all workspaces
- **Node.js 20+** is required for backend
- **pnpm 8+** is required for workspace management
- Dependencies are organized by workspace (monorepo structure)

---

## 🔗 Related Documentation

- [Development Phases](./DEVELOPMENT-PHASES.md)
- [Phase 1 Setup](./PHASE-CURRENT.md)
- [Project Structure](../README.md)

