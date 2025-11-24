<<<<<<< HEAD
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
=======
# ShopSavr 🛒💰

**Automatically find and apply the best coupon codes while shopping online. Save money effortlessly!**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/your-username/shopsavr/workflows/Node.js%20CI/badge.svg)](https://github.com/your-username/shopsavr/actions)
[![Coverage Status](https://coveralls.io/repos/github/your-username/shopsavr/badge.svg?branch=main)](https://coveralls.io/github/your-username/shopsavr?branch=main)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-username/shopsavr/releases)

## 🌟 Features

- **🔍 Automatic Coupon Detection**: Finds the best coupon codes across thousands of online stores
- **⚡ One-Click Application**: Applies coupons automatically at checkout
- **💝 Smart Wishlist**: Track prices and get alerts when items go on sale
- **📊 Savings Dashboard**: Monitor your total savings and shopping patterns
- **🔒 Secure & Private**: Your data stays private with enterprise-grade security
- **🌐 Browser Extension**: Works seamlessly with Chrome, Firefox, and Edge
- **📱 Mobile App**: iOS and Android apps for on-the-go savings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+
- Redis 6.0+
- Chrome/Firefox for extension development
>>>>>>> 42d7be730f727bd6f6c16acf3c494c979ffadf08

### Installation

1. **Clone the repository**
   ```bash
<<<<<<< HEAD
   git clone <repository-url>
   cd ShopSavr
=======
   git clone https://github.com/your-username/shopsavr.git
   cd shopsavr
>>>>>>> 42d7be730f727bd6f6c16acf3c494c979ffadf08
   ```

2. **Install dependencies**
   ```bash
<<<<<<< HEAD
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

=======
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend/web
   npm install
   
   # Extension dependencies
   cd ../extension
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your configuration
   ```

4. **Start the development servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend/web directory)
   npm start
   
   # Load extension (from frontend/extension directory)
   npm run build:dev
   ```

5. **Load the browser extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `frontend/extension/dist` folder

## 📁 Project Structure

```
shopsavr/
├── backend/                 # Node.js/Express API server
│   ├── controllers/         # Route controllers
│   ├── models/             # MongoDB models
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   └── tests/              # Backend tests
├── frontend/
│   ├── web/                # React web application
│   │   ├── src/
│   │   ├── public/
│   │   └── tests/
│   └── extension/          # Browser extension
│       ├── background.js   # Extension background script
│       ├── content.js      # Content script
│       ├── popup/          # Extension popup
│       └── manifest.json   # Extension manifest
├── mobile/                 # React Native mobile apps
│   ├── ios/
│   └── android/
├── docs/                   # Documentation
├── scripts/                # Build and deployment scripts
└── tests/                  # Integration tests
```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev          # Start development server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Frontend Development

```bash
cd frontend/web
npm start            # Start development server
npm test             # Run tests
npm run build        # Build for production
npm run storybook    # Start Storybook
```

### Extension Development

```bash
cd frontend/extension
npm run build:dev    # Build for development
npm run build:prod   # Build for production
npm run test         # Run extension tests
```

## 🧪 Testing

We maintain high test coverage across all components:

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:extension
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 📦 Deployment

### Staging Deployment

```bash
npm run deploy:staging
```

### Production Deployment

```bash
npm run deploy:production
```

### Extension Store Deployment

```bash
# Chrome Web Store
npm run deploy:chrome

# Firefox Add-ons
npm run deploy:firefox

# Edge Add-ons
npm run deploy:edge
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm run test:all`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- We use ESLint and Prettier for code formatting
- Follow the existing code style and conventions
- Write meaningful commit messages using [Conventional Commits](https://conventionalcommits.org/)

## 📊 API Documentation

API documentation is available at:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://api.shopsavr.xyz/docs

## 🔒 Security

Security is a top priority. Please see our [Security Policy](SECURITY.md) for reporting vulnerabilities.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors who have helped build ShopSavr
- Special thanks to the open-source community for the amazing tools and libraries
- Inspired by the need to make online shopping more affordable for everyone

## 📞 Support

- **Documentation**: [docs.shopsavr.xyz](https://docs.shopsavr.xyz)
- **Community**: [Discord Server](https://discord.gg/shopsavr)
- **Email**: support@shopsavr.xyz
- **Issues**: [GitHub Issues](https://github.com/your-username/shopsavr/issues)

## 🗺️ Roadmap

- [ ] AI-powered coupon prediction
- [ ] Social sharing features
- [ ] Cashback integration
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations

---

**Made with ❤️ by the ShopSavr Team**

*Save money, shop smarter, live better.*
>>>>>>> 42d7be730f727bd6f6c16acf3c494c979ffadf08
