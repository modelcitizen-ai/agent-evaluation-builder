#!/bin/bash

# Database Credential Rotation Script
# This script helps rotate PostgreSQL database credentials in Azure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Run: az login"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Database Credential Rotation Script                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
DB_SERVER_NAME="${DB_SERVER_NAME:-human-eval-db-server}"
RESOURCE_GROUP="${RESOURCE_GROUP:-human-eval-rg}"
DB_USER="${DB_USER:-dbadmin}"
APP_NAME="${APP_NAME:-human-eval-builder}"

print_info "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  DB Server: $DB_SERVER_NAME"
echo "  DB User: $DB_USER"
echo "  App Service: $APP_NAME"
echo ""

# Generate a new secure password
generate_password() {
    # Generate a 20-character password with letters, numbers, and special characters
    NEW_PASSWORD=$(openssl rand -base64 20 | tr -d "=" | tr "/" "_" | cut -c1-20)
    echo "$NEW_PASSWORD"
}

print_warning "This script will:"
echo "  1. Generate a new secure password"
echo "  2. Update the PostgreSQL server admin password"
echo "  3. Update the Azure App Service DATABASE_URL setting"
echo "  4. Save the new credentials to .env.local"
echo ""

read -p "Do you want to continue? (y/N): " -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Operation cancelled"
    exit 0
fi

# Step 1: Generate new password
print_info "Generating new secure password..."
NEW_PASSWORD=$(generate_password)
print_success "New password generated"

# Step 2: Update PostgreSQL server password
print_info "Updating PostgreSQL server password..."
az postgres server update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_SERVER_NAME" \
    --admin-password "$NEW_PASSWORD" \
    --output none

if [ $? -eq 0 ]; then
    print_success "PostgreSQL server password updated"
else
    print_error "Failed to update PostgreSQL server password"
    exit 1
fi

# Step 3: Update App Service settings
print_info "Updating App Service DATABASE_URL..."
DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"
DB_NAME="${DB_NAME:-humanevaldb}"
NEW_DATABASE_URL="postgresql://${DB_USER}:${NEW_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings DATABASE_URL="$NEW_DATABASE_URL" \
    --output none

if [ $? -eq 0 ]; then
    print_success "App Service DATABASE_URL updated"
else
    print_error "Failed to update App Service settings"
    exit 1
fi

# Step 4: Update local .env.local file
print_info "Updating local .env.local file..."

# Backup existing .env.local if it exists
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    print_info "Backed up existing .env.local"
fi

# Update or create .env.local
if [ -f .env.local ]; then
    # Update existing DATABASE_URL
    if grep -q "^DATABASE_URL=" .env.local; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$NEW_DATABASE_URL\"|" .env.local
        rm -f .env.local.bak
    else
        echo "DATABASE_URL=\"$NEW_DATABASE_URL\"" >> .env.local
    fi
else
    # Create new .env.local
    cat > .env.local << EOF
# PostgreSQL Database Connection
DATABASE_URL="$NEW_DATABASE_URL"

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY="your-api-key-here"
AZURE_OPENAI_ENDPOINT="your-endpoint-here"
AZURE_OPENAI_DEPLOYMENT="your-deployment-here"
EOF
fi

print_success "Local .env.local file updated"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 Rotation Completed Successfully                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_success "Database credentials have been rotated successfully!"
echo ""
print_warning "IMPORTANT: Keep your .env.local file secure and never commit it to git"
print_info "The new DATABASE_URL has been saved to .env.local"
print_info "Old .env.local files have been backed up with timestamps"
echo ""
print_info "Next steps:"
echo "  1. Restart your App Service: az webapp restart -g $RESOURCE_GROUP -n $APP_NAME"
echo "  2. Test the connection locally: npm run dev"
echo "  3. Securely delete backup files when no longer needed"
echo ""
