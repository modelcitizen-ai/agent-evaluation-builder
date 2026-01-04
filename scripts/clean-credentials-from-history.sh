#!/bin/bash

# Git History Cleanup Script for agent-evaluation-builder Fork
# This script removes hardcoded credentials from git history

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "ℹ️  $1"; }

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      Git History Cleanup - Remove Hardcoded Credentials       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

print_warning "This script will rewrite git history to remove hardcoded credentials."
print_warning "This affects commits on the 'backend' branch."
echo ""
print_info "Affected commits:"
git log --oneline --all -- scripts/add-missing-column.js scripts/deploy-backend-postgresql.sh scripts/deploy-backend-postgresql-fixed.sh | head -8
echo ""

read -p "Do you want to continue? (y/N): " -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Operation cancelled"
    exit 0
fi

# Create a backup branch
BACKUP_BRANCH="backup-before-cleanup-$(date +%Y%m%d_%H%M%S)"
print_info "Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"
print_success "Backup created"

# Use git filter-repo if available (recommended), otherwise use filter-branch
if command -v git-filter-repo &> /dev/null; then
    print_info "Using git-filter-repo (recommended method)..."
    
    # Create a temporary expressions file
    cat > /tmp/filter-expressions.txt << 'EOF'
regex:HumanEval2025!==>REDACTED
regex:postgresql://dbadmin:[^@]+@==>postgresql://dbadmin:REDACTED@
EOF
    
    git filter-repo --replace-text /tmp/filter-expressions.txt --force
    rm /tmp/filter-expressions.txt
    
else
    print_warning "git-filter-repo not found, using filter-branch (slower)..."
    print_info "Install git-filter-repo with: pip install git-filter-repo"
    
    # Use filter-branch to replace credentials
    git filter-branch --force --tree-filter '
        for file in scripts/add-missing-column.js scripts/deploy-backend-postgresql.sh scripts/deploy-backend-postgresql-fixed.sh; do
            if [ -f "$file" ]; then
                sed -i.bak "s|HumanEval2025!|REDACTED|g" "$file"
                sed -i.bak "s|postgresql://dbadmin:[^@]*@|postgresql://dbadmin:REDACTED@|g" "$file"
                rm -f "$file.bak"
            fi
        done
    ' --tag-name-filter cat -- --all
    
    # Clean up
    git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
fi

echo ""
print_success "Git history has been cleaned!"
echo ""
print_info "Next steps:"
echo "  1. Verify the changes: git log -p -- scripts/add-missing-column.js"
echo "  2. Force push to your fork: git push origin backend --force"
echo "  3. If anything goes wrong, restore from backup: git reset --hard $BACKUP_BRANCH"
echo ""
print_warning "Remember: Force pushing rewrites history. Only do this on your fork!"
echo ""
