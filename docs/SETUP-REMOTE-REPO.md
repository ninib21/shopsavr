# Setting Up Remote Git Repository

This guide will help you create a remote repository and push all your commits.

## Quick Setup (Automated)

### Option 1: Using GitHub CLI (Recommended)

If you have GitHub CLI installed:

```powershell
# 1. Authenticate with GitHub
gh auth login

# 2. Run the setup script
.\scripts\setup-remote-repo.ps1
```

This will:
- Create a new GitHub repository named "ShopSavr"
- Set it as the remote origin
- Push all commits and branches

### Option 2: Using Script with Repository URL

If you've already created a repository on GitHub:

```powershell
.\scripts\setup-remote-repo.ps1 -RemoteUrl "https://github.com/YOUR_USERNAME/ShopSavr.git"
```

## Manual Setup

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. **Repository name**: `ShopSavr`
3. **Description**: `ShopSavr™ - Intelligent Coupon & Deal Finder App`
4. Choose **Public** or **Private**
5. **DO NOT** check:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. Click **"Create repository"**

### Step 2: Add Remote and Push

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ShopSavr.git

# Verify remote was added
git remote -v

# Push main branch
git push -u origin main

# Push all branches (if any)
git push --all origin

# Push all tags (if any)
git push --tags origin
```

### Step 3: Verify

```powershell
# Check remote status
git remote show origin

# View commits
git log --oneline --all --graph
```

## Current Commits to Push

Your repository currently has these commits:

```
2814924 - docs: add git workflow guide
f7d02b4 - docs: add current phase quick start guide
378040b - docs: add phased development plan
8e77b9a - feat: initialize ShopSavr project structure
```

All commits will be pushed to the remote repository.

## Alternative: GitHub Desktop

1. Open GitHub Desktop
2. File → Add Local Repository
3. Select `C:\Naimah__Projects\ShopSavr`
4. Repository → Publish Repository
5. Choose name and visibility
6. Click "Publish Repository"

## Troubleshooting

### Error: "remote origin already exists"

```powershell
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/ShopSavr.git
```

### Error: "Authentication failed"

```powershell
# Use GitHub CLI to authenticate
gh auth login

# Or use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/ShopSavr.git
```

### Error: "Repository not found"

- Verify the repository exists on GitHub
- Check the repository URL is correct
- Ensure you have access permissions

## After Setup

Once the remote is configured:

1. **Always push after commits**:
   ```powershell
   git push origin main
   ```

2. **For phase branches**:
   ```powershell
   git push origin phase-X-feature
   ```

3. **Set upstream tracking**:
   ```powershell
   git push -u origin branch-name
   ```

## Next Steps

After pushing to remote:

1. ✅ Verify commits appear on GitHub
2. ✅ Set up branch protection rules (optional)
3. ✅ Configure GitHub Actions for CI/CD (Phase 10)
4. ✅ Add collaborators (if working in a team)

