#!/usr/bin/env pwsh
# Script to setup remote git repository and push all commits

param(
    [string]$RepoName = "ShopSavr",
    [string]$Description = "ShopSavr™ - Intelligent Coupon & Deal Finder App",
    [switch]$Private = $false,
    [string]$RemoteUrl = ""
)

Write-Host "=== ShopSavr Git Remote Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is available
$ghAvailable = $false
try {
    $null = gh --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ghAvailable = $true
        Write-Host "✅ GitHub CLI detected" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  GitHub CLI not found" -ForegroundColor Yellow
}

# Method 1: Use GitHub CLI if available
if ($ghAvailable -and [string]::IsNullOrEmpty($RemoteUrl)) {
    Write-Host "Creating GitHub repository using GitHub CLI..." -ForegroundColor Cyan
    
    # Check if user is authenticated
    try {
        $null = gh auth status 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Not authenticated with GitHub CLI" -ForegroundColor Yellow
            Write-Host "Run: gh auth login" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "⚠️  Error checking GitHub CLI auth" -ForegroundColor Yellow
        exit 1
    }
    
    # Create repository
    $visibility = if ($Private) { "--private" } else { "--public" }
    $repoUrl = gh repo create $RepoName --description $Description $visibility --source=. --remote=origin --push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Repository created and pushed!" -ForegroundColor Green
        Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "❌ Failed to create repository" -ForegroundColor Red
        exit 1
    }
}

# Method 2: Manual setup with provided URL
if (-not [string]::IsNullOrEmpty($RemoteUrl)) {
    Write-Host "Setting up remote with provided URL..." -ForegroundColor Cyan
    
    # Add remote
    git remote add origin $RemoteUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote added: $RemoteUrl" -ForegroundColor Green
        
        # Push all branches and tags
        Write-Host "Pushing to remote..." -ForegroundColor Cyan
        git push -u origin main
        git push --all origin
        git push --tags origin
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ All commits pushed successfully!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "❌ Failed to push commits" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Failed to add remote" -ForegroundColor Red
        exit 1
    }
}

# Method 3: Manual instructions
Write-Host "=== Manual Setup Instructions ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Create repository on GitHub.com" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: $RepoName" -ForegroundColor White
Write-Host "3. Description: $Description" -ForegroundColor White
Write-Host "4. Choose $($Private ? 'Private' : 'Public')" -ForegroundColor White
Write-Host "5. DO NOT initialize with README, .gitignore, or license" -ForegroundColor White
Write-Host "6. Click 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "Then run:" -ForegroundColor Yellow
Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/$RepoName.git" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host "  git push --all origin" -ForegroundColor White
Write-Host "  git push --tags origin" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Use this script with GitHub CLI" -ForegroundColor Yellow
Write-Host "  gh auth login" -ForegroundColor White
Write-Host "  .\scripts\setup-remote-repo.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Use this script with repository URL" -ForegroundColor Yellow
Write-Host "  .\scripts\setup-remote-repo.ps1 -RemoteUrl 'https://github.com/USER/REPO.git'" -ForegroundColor White
Write-Host ""

