#!/bin/bash

# ShopSavr GitHub Repository Setup Script
# This script helps set up the GitHub repository with all necessary configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    if ! command_exists gh; then
        print_warning "GitHub CLI is not installed. Some features will be limited."
        print_status "Install GitHub CLI from: https://cli.github.com/"
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Initialize git repository
init_git_repo() {
    print_status "Initializing Git repository..."
    
    if [ ! -d ".git" ]; then
        git init
        print_success "Git repository initialized"
    else
        print_warning "Git repository already exists"
    fi
    
    # Set up git hooks
    if command_exists npx; then
        print_status "Setting up Git hooks..."
        npx husky install
        npx husky add .husky/pre-commit "npm run precommit"
        npx husky add .husky/commit-msg "npx commitlint --edit \$1"
        print_success "Git hooks configured"
    fi
}

# Create GitHub repository
create_github_repo() {
    if command_exists gh; then
        print_status "Creating GitHub repository..."
        
        read -p "Enter your GitHub username: " github_username
        read -p "Enter repository name (default: shopsavr): " repo_name
        repo_name=${repo_name:-shopsavr}
        
        read -p "Make repository private? (y/N): " make_private
        
        if [[ $make_private =~ ^[Yy]$ ]]; then
            visibility="--private"
        else
            visibility="--public"
        fi
        
        gh repo create "$repo_name" $visibility --description "Automatically find and apply the best coupon codes while shopping online" --clone=false
        
        # Add remote origin
        git remote add origin "https://github.com/$github_username/$repo_name.git"
        
        print_success "GitHub repository created: https://github.com/$github_username/$repo_name"
    else
        print_warning "GitHub CLI not available. Please create repository manually:"
        print_status "1. Go to https://github.com/new"
        print_status "2. Create a repository named 'shopsavr'"
        print_status "3. Add remote: git remote add origin https://github.com/YOUR_USERNAME/shopsavr.git"
    fi
}

# Set up GitHub repository settings
setup_github_settings() {
    if command_exists gh; then
        print_status "Configuring GitHub repository settings..."
        
        # Enable issues and wiki
        gh repo edit --enable-issues --enable-wiki
        
        # Set up branch protection
        print_status "Setting up branch protection rules..."
        gh api repos/:owner/:repo/branches/main/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
            --field enforce_admins=true \
            --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
            --field restrictions=null \
            2>/dev/null || print_warning "Could not set up branch protection (may require admin access)"
        
        print_success "GitHub repository settings configured"
    fi
}

# Create GitHub labels
create_github_labels() {
    if command_exists gh; then
        print_status "Creating GitHub labels..."
        
        # Define labels
        labels=(
            "bug:d73a4a:Something isn't working"
            "enhancement:a2eeef:New feature or request"
            "documentation:0075ca:Improvements or additions to docs"
            "good first issue:7057ff:Good for newcomers"
            "help wanted:008672:Extra attention is needed"
            "priority: high:b60205:High priority"
            "priority: medium:fbca04:Medium priority"
            "priority: low:0e8a16:Low priority"
            "status: in progress:yellow:Currently being worked on"
            "status: needs review:orange:Needs code review"
            "frontend:e99695:Frontend related"
            "backend:c2e0c6:Backend related"
            "extension:bfd4f2:Browser extension related"
            "mobile:f9d0c4:Mobile app related"
            "security:d4c5f9:Security related"
            "performance:fef2c0:Performance related"
            "testing:c5def5:Testing related"
            "dependencies:0366d6:Pull requests that update a dependency file"
        )
        
        for label in "${labels[@]}"; do
            IFS=':' read -r name color description <<< "$label"
            gh label create "$name" --color "$color" --description "$description" 2>/dev/null || true
        done
        
        print_success "GitHub labels created"
    fi
}

# Set up GitHub secrets
setup_github_secrets() {
    if command_exists gh; then
        print_status "Setting up GitHub secrets..."
        print_warning "You'll need to add the following secrets manually in GitHub:"
        print_status "- STRIPE_SECRET_KEY: Your Stripe secret key"
        print_status "- MONGODB_URI: Your MongoDB connection string"
        print_status "- JWT_SECRET: Your JWT secret key"
        print_status "- SLACK_WEBHOOK: Your Slack webhook URL for notifications"
        print_status "- SNYK_TOKEN: Your Snyk token for security scanning"
        print_status ""
        print_status "Go to: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/settings/secrets/actions"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        print_status "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend/web" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend/web && npm install && cd ../..
    fi
    
    # Install extension dependencies
    if [ -d "frontend/extension" ]; then
        print_status "Installing extension dependencies..."
        cd frontend/extension && npm install && cd ../..
    fi
    
    print_success "Dependencies installed"
}

# Create initial commit
create_initial_commit() {
    print_status "Creating initial commit..."
    
    git add .
    git commit -m "feat: initial project setup with complete GitHub repository structure

- Add comprehensive README with project overview and setup instructions
- Add contributing guidelines and code of conduct
- Add security policy and issue templates
- Set up CI/CD pipeline with GitHub Actions
- Add Docker configuration for development
- Create project architecture documentation
- Set up linting, formatting, and testing infrastructure
- Add comprehensive .gitignore for all project components"
    
    print_success "Initial commit created"
}

# Push to GitHub
push_to_github() {
    print_status "Pushing to GitHub..."
    
    git branch -M main
    git push -u origin main
    
    print_success "Code pushed to GitHub"
}

# Main setup function
main() {
    echo "🚀 ShopSavr GitHub Repository Setup"
    echo "=================================="
    echo ""
    
    check_prerequisites
    init_git_repo
    create_github_repo
    setup_github_settings
    create_github_labels
    setup_github_secrets
    install_dependencies
    create_initial_commit
    push_to_github
    
    echo ""
    echo "🎉 GitHub repository setup completed!"
    echo ""
    print_success "Next steps:"
    print_status "1. Set up GitHub secrets for CI/CD"
    print_status "2. Configure your development environment"
    print_status "3. Start developing amazing features!"
    print_status "4. Create your first pull request"
    echo ""
    print_status "Repository URL: $(git remote get-url origin 2>/dev/null || echo 'Not set')"
    print_status "Happy coding! 🛒💰"
}

# Run main function
main "$@"