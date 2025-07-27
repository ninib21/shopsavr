# Contributing to ShopSavr 🤝

Thank you for your interest in contributing to ShopSavr! We welcome contributions from developers of all skill levels. This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Types of Contributions

We welcome many types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🧪 **Tests**
- 🎨 **UI/UX improvements**
- 🔧 **Performance optimizations**
- 🌐 **Translations**

### Before You Start

1. Check if there's already an [issue](https://github.com/your-username/shopsavr/issues) for what you want to work on
2. If not, create an issue to discuss your proposed changes
3. Wait for feedback from maintainers before starting work on large changes

## 💻 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB 5.0+
- Redis 6.0+
- Git

### Setup Steps

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/shopsavr.git
   cd shopsavr
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies
   npm run install:all
   
   # Or install individually
   cd backend && npm install
   cd ../frontend/web && npm install
   cd ../extension && npm install
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your local configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev:all
   ```

5. **Verify setup**
   - Backend: http://localhost:3000
   - Frontend: http://localhost:3001
   - Load extension in browser

## 🔄 Making Changes

### Branching Strategy

We use a simplified Git flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Feature branches
- `bugfix/bug-name` - Bug fix branches
- `hotfix/fix-name` - Critical fixes

### Creating a Branch

```bash
# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b bugfix/issue-number-description
```

### Commit Messages

We use [Conventional Commits](https://conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(extension): add automatic coupon detection
fix(api): resolve user authentication issue
docs(readme): update installation instructions
test(backend): add unit tests for coupon service
```

## 📤 Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run tests and linting**
   ```bash
   npm run test:all
   npm run lint:all
   npm run format:all
   ```

3. **Push your branch**
   ```bash
   git push origin your-branch
   ```

4. **Create a Pull Request**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues using keywords (e.g., "Closes #123")
   - Add screenshots for UI changes
   - Request reviews from relevant team members

### Pull Request Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🎨 Code Style Guidelines

### JavaScript/TypeScript

- Use ESLint and Prettier configurations
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promises when possible

### React Components

- Use functional components with hooks
- Follow the component structure:
  ```jsx
  // Imports
  import React from 'react';
  
  // Types/Interfaces
  interface Props {
    // ...
  }
  
  // Component
  const Component: React.FC<Props> = ({ prop1, prop2 }) => {
    // Hooks
    // Event handlers
    // Render
  };
  
  export default Component;
  ```

### CSS/Styling

- Use CSS modules or styled-components
- Follow BEM methodology for class names
- Use CSS custom properties for theming
- Ensure responsive design
- Follow accessibility guidelines

### Backend Code

- Use Express.js best practices
- Implement proper error handling
- Use middleware for cross-cutting concerns
- Follow RESTful API conventions
- Implement proper validation and sanitization

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Writing Tests

- Write tests for all new features
- Maintain or improve test coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

### Test Commands

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms and business logic
- Update README.md for significant changes
- Add inline comments for non-obvious code

### API Documentation

- Update OpenAPI/Swagger specs for API changes
- Include request/response examples
- Document error codes and messages

## 🏷️ Issue Labels

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority
- `priority: low` - Low priority
- `status: in progress` - Currently being worked on
- `status: needs review` - Needs code review

## 🌟 Recognition

Contributors are recognized in:

- README.md contributors section
- Release notes
- Annual contributor appreciation posts
- Special Discord roles for active contributors

## ❓ Getting Help

If you need help:

1. Check existing [documentation](https://docs.shopsavr.xyz)
2. Search [existing issues](https://github.com/your-username/shopsavr/issues)
3. Join our [Discord community](https://discord.gg/shopsavr)
4. Create a new issue with the `question` label

## 📞 Contact

- **Discord**: [ShopSavr Community](https://discord.gg/shopsavr)
- **Email**: contributors@shopsavr.xyz
- **Twitter**: [@ShopSavrApp](https://twitter.com/ShopSavrApp)

---

Thank you for contributing to ShopSavr! Every contribution, no matter how small, helps make online shopping more affordable for everyone. 🛒💰