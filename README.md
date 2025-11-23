# ShopSavr™ - Intelligent Coupon & Deal Finder

**ShopSavr™** is an intelligent coupon and deal finder application that automatically applies the best available coupons, scans receipts for price matching, monitors price drops, and aggregates deals from multiple sources.

## 🚀 Features

- **Auto-Apply Coupons**: Automatically detects and applies the best available coupon codes
- **Receipt Scanning**: OCR-powered receipt scanning with price matching
- **Price Alerts**: Monitor prices and get notified when they drop
- **Smart Search**: Aggregate deals from multiple sources in one place
- **Multi-Platform**: Browser extensions (Chrome/Firefox), iOS, and Android apps

## 📋 Project Structure

```
ShopSavr/
├── backend/          # Node.js + Express API
├── frontend/         # React 18 + Vite 7 web app
├── extension/       # Browser extension (Chrome/Firefox)
├── mobile/          # React Native app (iOS/Android)
├── specs/           # Feature specifications
└── docs/            # Documentation
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 7, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Payments**: Stripe, Cash App Pay
- **Notifications**: Firebase
- **Testing**: Jest, Vitest, Playwright

## 🏃 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ShopSavr
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   cd backend
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   pnpm dev:backend

   # Terminal 2: Frontend
   pnpm dev:frontend
   ```

## 📚 Documentation

- [Feature Specification](./specs/6-intelligent-deal-engine/spec.md)
- [Implementation Plan](./specs/6-intelligent-deal-engine/plan.md)
- [Task Breakdown](./specs/6-intelligent-deal-engine/tasks.md)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Backend tests
cd backend && pnpm test

# Frontend tests
cd frontend && pnpm test
```

## 📝 Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests and linting: `pnpm test && pnpm lint`
4. Commit following [Conventional Commits](https://www.conventionalcommits.org/)
5. Create a pull request

## 🤝 Contributing

Please read our contributing guidelines and code of conduct before submitting PRs.

## 📄 License

Copyright © 2025 Joud Holdings, BidayaX, and Divitiae Good Doers Inc. - NPO: 2023-001341848

## 🔗 Links

- [Constitution](./.specify/memory/constitution.md)
- [Project Documentation](./docs/)

