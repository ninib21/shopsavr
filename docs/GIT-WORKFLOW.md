# Git Workflow Guide

## Current Status

✅ **All work committed to git**

```
f7d02b4 - docs: add current phase quick start guide
378040b - docs: add phased development plan  
8e77b9a - feat: initialize ShopSavr project structure
```

## Branch Strategy

### Main Branches
- `main` - Production-ready code (protected)
- `phase-X-feature` - Feature branches for each development phase

### Phase Branches
- `phase-1-infrastructure` - Infrastructure setup
- `phase-2-authentication` - Authentication system
- `phase-3-coupon-engine` - MVP core feature
- `phase-4-receipt-scanning` - Receipt scanning
- `phase-5-price-alerts` - Price alerts
- `phase-6-smart-search` - Smart search
- `phase-7-dashboard` - User dashboard
- `phase-8-mobile` - Mobile apps
- `phase-9-polish` - Polish & security
- `phase-10-testing` - Testing & QA
- `phase-11-deployment` - Production deployment

## Workflow for Each Phase

### 1. Start Phase
```bash
# Create and switch to phase branch
git checkout -b phase-X-feature

# Work on tasks
# ... make changes ...
```

### 2. During Phase Development
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat(phase-X): brief description

- Change 1
- Change 2
- Change 3"
```

### 3. Complete Phase
```bash
# Final commit
git add .
git commit -m "feat(phase-X): complete phase X

- All tasks completed
- Tests passing
- Ready for merge

Phase: Phase Name Complete"

# Push to remote
git push origin phase-X-feature

# Merge to main (or create PR)
git checkout main
git merge phase-X-feature
git push origin main

# Tag release
git tag -a v0.X.0 -m "Release v0.X.0 - Phase X Complete"
git push origin v0.X.0
```

## Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

**Feature Commit**:
```
feat(phase-3): implement coupon detection service

- Add coupon detection algorithm
- Integrate with retailer APIs
- Add validation logic
- Add unit tests

Phase: Coupon Engine Progress
```

**Bug Fix Commit**:
```
fix(phase-2): resolve JWT token expiration issue

- Fix token refresh logic
- Update auth middleware
- Add expiration handling tests
```

**Documentation Commit**:
```
docs(phase-1): update setup instructions

- Add Redis setup steps
- Update environment variable guide
- Add troubleshooting section
```

## Daily Workflow

### Morning
```bash
# Pull latest changes
git checkout main
git pull origin main

# Create/switch to phase branch
git checkout phase-X-feature
git pull origin phase-X-feature
```

### During Development
```bash
# Make changes
# ... edit files ...

# Stage and commit frequently
git add .
git commit -m "feat(phase-X): implement feature Y"
```

### End of Day
```bash
# Push all commits
git push origin phase-X-feature

# Optional: Create backup branch
git checkout -b backup/phase-X-$(date +%Y%m%d)
git push origin backup/phase-X-$(date +%Y%m%d)
```

## Phase Completion Checklist

Before merging a phase branch:

- [ ] All phase tasks completed
- [ ] All tests passing (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch pushed to remote
- [ ] Code reviewed (if using PRs)

## Emergency Workflow

### Hotfix
```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# Fix bug
# ... make changes ...

# Commit and merge
git commit -m "fix: critical bug description"
git checkout main
git merge hotfix/critical-bug
git push origin main
```

### Revert
```bash
# Revert a specific commit
git revert <commit-hash>

# Revert merge
git revert -m 1 <merge-commit-hash>
```

## Best Practices

1. **Commit Frequently**: Small, focused commits are better than large ones
2. **Write Clear Messages**: Describe what and why, not how
3. **Test Before Committing**: Run tests before each commit
4. **Keep Branches Updated**: Regularly merge main into feature branches
5. **Use Descriptive Branch Names**: `phase-X-feature` format
6. **Tag Releases**: Tag each phase completion
7. **Protect Main**: Never force push to main
8. **Review Before Merge**: Always review changes before merging

## Remote Repository Setup

If you haven't set up a remote yet:

```bash
# Add remote (replace with your repo URL)
git remote add origin <repository-url>

# Push main branch
git push -u origin main

# Push all branches
git push --all origin

# Push tags
git push --tags origin
```

## Useful Commands

```bash
# View commit history
git log --oneline --graph --all

# View current status
git status

# View branch list
git branch -a

# View tags
git tag -l

# View changes
git diff

# View staged changes
git diff --cached

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Stash changes
git stash
git stash pop

# View remote
git remote -v
```

## Phase Progress Tracking

Track phase completion in git:

```bash
# Create progress file
echo "Phase 1: ✅ Complete" > PHASE-PROGRESS.md
git add PHASE-PROGRESS.md
git commit -m "docs: update phase progress"
```

Or use git tags:
```bash
# Tag phase completion
git tag -a phase-1-complete -m "Phase 1: Infrastructure Complete"
git push origin phase-1-complete
```

