# ShopSavr GitHub Repository Setup Script (PowerShell)
# This script helps set up the GitHub repository with all necessary configurations

param(
    [string]$GitHubUsername = "",
    [string]$RepoName = "shopsavr",
    [switch]$Private = $false
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    if (-not (Test-Command "git")) {
        Write-Error "Git is not installed. Please install Git first."
        exit 1
    }
    
    if (-not (Test-Command "gh")) {
        Write-Warning "GitHub CLI is not installed. Some features will be limited."
        Write-Status "Install GitHub CLI from: https://cli.github.com/"
    }
    
    if (-not (Test-Command "node")) {
        Write-Error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    }
    
    if (-not (Test-Command "npm")) {
        Write-Error "npm is not installed. Please install npm first."
        exit 1
    }
    
    Write-Success "Prerequisites check completed"
}

# Initialize git repository
function Initialize-GitRepo {
    Write-Status "Initializing Git repository..."
    
    if (-not (Test-Path ".git")) {
        git init
        Write-Success "Git repository initialized"
    } else {
        Write-Warning "Git repository already exists"
    }
    
    # Set up git hooks
    if (Test-Command "npx") {
        Write-Status "Setting up Git hooks..."
        npx husky install
        npx husky add .husky/pre-commit "npm run precommit"
        npx husky add .husky/commit-msg "npx commitlint --edit `$1"
        Write-Success "Git hooks configured"
    }
}

# Create GitHub repository
function New-GitHubRepo {
    if (Test-Command "gh") {
        Write-Status "Creating GitHub repository..."
        
        if (-not $GitHubUsername) {
            $GitHubUsername = Read-Host "Enter your GitHub username"
        }
        
        if (-not $RepoName) {
            $RepoName = Read-Host "Enter repository name (default: shopsavr)"
            if (-not $RepoName) { $RepoName = "shopsavr" }
        }
        
        if (-not $Private) {
            $makePrivate = Read-Host "Make repository private? (y/N)"
            $Private = $makePrivate -match "^[Yy]$"
        }
        
        $visibility = if ($Private) { "--private" } else { "--public" }
        
        gh repo create $RepoName $visibility --description "Automatically find and apply the best coupon codes while shopping online" --clone=$false
        
        # Add remote origin
        git remote add origin "https://github.com/$GitHubUsername/$RepoName.git"
        
        Write-Success "GitHub repository created: https://github.com/$GitHubUsername/$RepoName"
    } else {
        Write-Warning "GitHub CLI not available. Please create repository manually:"
        Write-Status "1. Go to https://github.com/new"
        Write-Status "2. Create a repository named 'shopsavr'"
        Write-Status "3. Add remote: git remote add origin https://github.com/YOUR_USERNAME/shopsavr.git"
    }
}

# Set up GitHub repository settings
function Set-GitHubSettings {
    if (Test-Command "gh") {
        Write-Status "Configuring GitHub repository settings..."
        
        # Enable issues and wiki
        gh repo edit --enable-issues --enable-wiki
        
        Write-Success "GitHub repository settings configured"
    }
}

# Create GitHub labels
function New-GitHubLabels {
    if (Test-Command "gh") {
        Write-Status "Creating GitHub labels..."
        
        # Define labels
        $labels = @(
            @{name="bug"; color="d73a4a"; description="Something isn't working"},
            @{name="enhancement"; color="a2eeef"; description="New feature or request"},
            @{name="documentation"; color="0075ca"; description="Improvements or additions to docs"},
            @{name="good first issue"; color="7057ff"; description="Good for newcomers"},
            @{name="help wanted"; color="008672"; description="Extra attention is needed"},
            @{name="priority: high"; color="b60205"; description="High priority"},
            @{name="priority: medium"; color="fbca04"; description="Medium priority"},
            @{name="priority: low"; color="0e8a16"; description="Low priority"},
            @{name="status: in progress"; color="yellow"; description="Currently being worked on"},
            @{name="status: needs review"; color="orange"; description="Needs code review"},
            @{name="frontend"; color="e99695"; description="Frontend related"},
            @{name="backend"; color="c2e0c6"; description="Backend related"},
            @{name="extension"; color="bfd4f2"; description="Browser extension related"},
            @{name="mobile"; color="f9d0c4"; description="Mobile app related"},
            @{name="security"; color="d4c5f9"; description="Security related"},
            @{name="performance"; color="fef2c0"; description="Performance related"},
            @{name="testing"; color="c5def5"; description="Testing related"},
            @{name="dependencies"; color="0366d6"; description="Pull requests that update a dependency file"}
        )
        
        foreach ($label in $labels) {
            try {
                gh label create $label.name --color $label.color --description $label.description 2>$null
            } catch {
                # Label might already exist, continue
            }
        }
        
        Write-Success "GitHub labels created"
    }
}

# Set up GitHub secrets
function Set-GitHubSecrets {
    if (Test-Command "gh") {
        Write-Status "Setting up GitHub secrets..."
        Write-Warning "You'll need to add the following secrets manually in GitHub:"
        Write-Status "- STRIPE_SECRET_KEY: Your Stripe secret key"
        Write-Status "- MONGODB_URI: Your MongoDB connection string"
        Write-Status "- JWT_SECRET: Your JWT secret key"
        Write-Status "- SLACK_WEBHOOK: Your Slack webhook URL for notifications"
        Write-Status "- SNYK_TOKEN: Your Snyk token for security scanning"
        Write-Status ""
        
        $repoInfo = gh repo view --json owner,name | ConvertFrom-Json
        $repoUrl = "https://github.com/$($repoInfo.owner.login)/$($repoInfo.name)/settings/secrets/actions"
        Write-Status "Go to: $repoUrl"
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing project dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    if (Test-Path "backend") {
        Write-Status "Installing backend dependencies..."
        Push-Location backend
        npm install
        Pop-Location
    }
    
    # Install frontend dependencies
    if (Test-Path "frontend/web") {
        Write-Status "Installing frontend dependencies..."
        Push-Location frontend/web
        npm install
        Pop-Location
    }
    
    # Install extension dependencies
    if (Test-Path "frontend/extension") {
        Write-Status "Installing extension dependencies..."
        Push-Location frontend/extension
        npm install
        Pop-Location
    }
    
    Write-Success "Dependencies installed"
}

# Create initial commit
function New-InitialCommit {
    Write-Status "Creating initial commit..."
    
    git add .
    git commit -m @"
feat: initial project setup with complete GitHub repository structure

- Add comprehensive README with project overview and setup instructions
- Add contributing guidelines and code of conduct
- Add security policy and issue templates
- Set up CI/CD pipeline with GitHub Actions
- Add Docker configuration for development
- Create project architecture documentation
- Set up linting, formatting, and testing infrastructure
- Add comprehensive .gitignore for all project components
"@
    
    Write-Success "Initial commit created"
}

# Push to GitHub
function Push-ToGitHub {
    Write-Status "Pushing to GitHub..."
    
    git branch -M main
    git push -u origin main
    
    Write-Success "Code pushed to GitHub"
}

# Main setup function
function Main {
    Write-Host "🚀 ShopSavr GitHub Repository Setup" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Prerequisites
    Initialize-GitRepo
    New-GitHubRepo
    Set-GitHubSettings
    New-GitHubLabels
    Set-GitHubSecrets
    Install-Dependencies
    New-InitialCommit
    Push-ToGitHub
    
    Write-Host ""
    Write-Host "🎉 GitHub repository setup completed!" -ForegroundColor Cyan
    Write-Host ""
    Write-Success "Next steps:"
    Write-Status "1. Set up GitHub secrets for CI/CD"
    Write-Status "2. Configure your development environment"
    Write-Status "3. Start developing amazing features!"
    Write-Status "4. Create your first pull request"
    Write-Host ""
    
    try {
        $repoUrl = git remote get-url origin 2>$null
        Write-Status "Repository URL: $repoUrl"
    } catch {
        Write-Status "Repository URL: Not set"
    }
    
    Write-Status "Happy coding! 🛒💰"
}

# Run main function
Main