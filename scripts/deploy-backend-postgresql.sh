#!/bin/bash
# Simple PostgreSQL backend deployment script for Human Evaluation Builder
# Mirrors the localStorage deployment but uses PostgreSQL

set -e
trap 'echo "❌ Error occurred at line $LINENO. Exiting..."; exit 1' ERR

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Backend configuration - App Service in eastus2, PostgreSQL in swedencentral
readonly APP_NAME="human-eval-backend"
readonly RESOURCE_GROUP="human-eval-backend-rg"  # New RG in eastus2
readonly LOCATION="eastus2"
readonly PLAN_NAME="ASP-humanevaltestingrg-8fdc"
readonly DB_SERVER_NAME="human-eval-db-server"  # Stays in swedencentral
readonly DB_RESOURCE_GROUP="human-eval-backend-rg"  # Original RG for PostgreSQL
readonly DB_NAME="humanevaldb"
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly DEPLOY_ZIP="deployment_backend_${TIMESTAMP}.zip"

print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 Human Evaluation Builder                         ║${NC}"
    echo -e "${CYAN}║                 PostgreSQL Backend Deployment                    ║${NC}"
    echo -e "${CYAN}║                        $(date)                                   ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo "────────────────────────────────────────────────────────────────────"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_banner

# Validation functions
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        echo -e "${RED}❌ Azure CLI not found. Please install Azure CLI first.${NC}"
        echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node -v)${NC}"
        exit 1
    fi
    print_success "Node.js $(node -v) found"
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        print_info "Not logged in to Azure. Starting login process..."
        az login
    fi
    
    # Confirm Azure subscription and tenant
    confirm_azure_subscription
}

confirm_azure_subscription() {
    print_section "Azure Subscription Confirmation"
    
    # Get current account details
    local subscription_name=$(az account show --query name -o tsv)
    local subscription_id=$(az account show --query id -o tsv)
    local tenant_id=$(az account show --query tenantId -o tsv)
    local user_name=$(az account show --query user.name -o tsv)
    
    echo ""
    echo -e "${CYAN}Current Azure Account Details:${NC}"
    echo "  • User: $user_name"
    echo "  • Subscription: $subscription_name"
    echo "  • Subscription ID: $subscription_id"
    echo "  • Tenant ID: $tenant_id"
    echo ""
    echo -e "${YELLOW}PostgreSQL Backend Deployment Target:${NC}"
    echo "  • App Service Resource Group: $RESOURCE_GROUP (${LOCATION})"
    echo "  • App Name: $APP_NAME"
    echo "  • Database Resource Group: $DB_RESOURCE_GROUP"
    echo "  • Database Server: $DB_SERVER_NAME (swedencentral)"
    echo ""
    
    # Confirm with user
    read -p "Is this the correct subscription for PostgreSQL backend deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Please switch to the correct subscription/tenant before continuing."
        echo ""
        echo "To switch subscriptions:"
        echo "  az account list --output table"
        echo "  az account set --subscription <subscription-id>"
        echo ""
        echo "To switch tenants:"
        echo "  az logout"
        echo "  az login --tenant <tenant-id>"
        echo ""
        exit 1
    fi
    
    print_success "Azure subscription confirmed"
    
    # Verify access to resource group location
    print_info "Verifying access to location: $LOCATION"
    if az provider show --namespace Microsoft.Web --query "resourceTypes[?resourceType=='sites'].locations" -o tsv | grep -qi "$LOCATION"; then
        print_success "Location $LOCATION is available"
    else
        print_warning "Location $LOCATION may not be available or accessible"
        echo "Available locations for App Service:"
        az provider show --namespace Microsoft.Web --query "resourceTypes[?resourceType=='sites'].locations" -o tsv | sort
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

verify_azure_resources() {
    print_section "Verifying Azure Resources"
    
    # Check if App Service resource group exists
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        echo -e "${RED}❌ App Service resource group '$RESOURCE_GROUP' not found${NC}"
        echo "Please create the resource group first or use the correct resource group name"
        exit 1
    fi
    print_success "App Service resource group exists"
    
    # Check if App Service exists
    if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo -e "${RED}❌ App Service '$APP_NAME' not found in resource group '$RESOURCE_GROUP'${NC}"
        echo "Please create the App Service first or use the correct app name"
        exit 1
    fi
    print_success "App Service exists"
    
    # Verify PostgreSQL server accessibility
    print_info "Verifying PostgreSQL server accessibility..."
    if az postgres flexible-server show --name "$DB_SERVER_NAME" --resource-group "$DB_RESOURCE_GROUP" &> /dev/null; then
        print_success "PostgreSQL server accessible"
        
        # Show database connection details
        local db_host="${DB_SERVER_NAME}.postgres.database.azure.com"
        print_info "Database connection details:"
        echo "  • Host: $db_host"
        echo "  • Database: $DB_NAME"
        echo "  • SSL: Required"
    else
        echo -e "${RED}❌ PostgreSQL server '$DB_SERVER_NAME' not accessible${NC}"
        echo "Please verify:"
        echo "  • Server exists: $DB_SERVER_NAME"
        echo "  • Resource group: $DB_RESOURCE_GROUP"
        echo "  • Firewall rules allow connections"
        exit 1
    fi
}

# Check if we're on the backend branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "backend" ]; then
    echo -e "${RED}❌ Must be on 'backend' branch to deploy backend version${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Run: git checkout backend"
    exit 1
fi

# Check for required environment variables
if [ -z "$AZURE_OPENAI_API_KEY" ] || [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_DEPLOYMENT" ]; then
    echo -e "${RED}❌ Required Azure OpenAI environment variables not set${NC}"
    echo "Please set:"
    echo "  - AZURE_OPENAI_API_KEY"
    echo "  - AZURE_OPENAI_ENDPOINT"
    echo "  - AZURE_OPENAI_DEPLOYMENT"
    exit 1
fi

# Run prerequisite checks
check_prerequisites
verify_azure_resources

print_section "Building Application"

# Install dependencies and build (same as localStorage version)
print_info "Installing dependencies..."
npm install --legacy-peer-deps

print_info "Building Next.js application..."
npm run build

print_success "Application built successfully"

print_section "Creating Deployment Package"

# Use the proven approach from localStorage deployment
print_info "Creating production deployment package..."

# Create temporary directory for deployment build
temp_dir=$(mktemp -d)
print_info "Using temporary directory: $temp_dir"

# Copy application files (excluding development files)
print_info "Copying application files..."
cp -r . "$temp_dir/"
cd "$temp_dir"

# Remove unwanted files and directories but KEEP .next build
rm -rf node_modules .git *.log .env* __tests__ docs *.md deployment_*.zip 2>/dev/null || true

# Ensure .next directory exists (it should from our build step)
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ .next build directory not found! Build may have failed.${NC}"
    exit 1
fi
print_success ".next build directory found and included"

# Use the original package.json but modify the start script
print_info "Updating package.json for production..."
# The original package.json should already be in the temp directory from the copy operation

# Update the start script to use server.js instead of next dev
sed -i '' 's/"dev": "next dev"/"start": "node server.js"/' package.json || sed -i 's/"dev": "next dev"/"start": "node server.js"/' package.json
sed -i '' 's/"start": "next start"/"start": "node server.js"/' package.json || sed -i 's/"start": "next start"/"start": "node server.js"/' package.json

# Install all dependencies (not just production) to ensure Next.js works properly
print_info "Installing all dependencies..."
npm install --legacy-peer-deps --no-fund --no-audit

print_info "Skipping Windows-specific web.config and Linux startup script (not required for Linux App Service)."

cd - > /dev/null

# Create deployment zip
print_info "Creating deployment archive..."
cd "$temp_dir"
zip -r "../$DEPLOY_ZIP" . -x "*.DS_Store" ".git/*" "*.log" "node_modules/.cache/*"
cd - > /dev/null

# Move zip to current directory and clean up
mv "$temp_dir/../$DEPLOY_ZIP" "./$DEPLOY_ZIP"
rm -rf "$temp_dir"

print_success "Deployment package created: $DEPLOY_ZIP"

print_section "Deploying to Azure"

# Deploy to existing Azure resources (assumes they're already set up)
print_info "Deploying to existing Azure App Service..."

az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src $DEPLOY_ZIP

print_success "Application deployed to Azure"

print_section "Configuring App Settings"

# Configure app settings
print_info "Setting application configuration..."

# Initial deployment configuration
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        SCM_DO_BUILD_DURING_DEPLOYMENT="false" \
        ENABLE_ORYX_BUILD="false" \
        WEBSITE_RUN_FROM_PACKAGE="1" \
        NODE_ENV="production" \
        WEBSITES_PORT="8080" \
        PORT="8080" \
                USE_POSTGRES="true" \
        AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
        AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
        AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT"

# Configure PostgreSQL connection (securely)
DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"

# Prefer DATABASE_URL if provided; otherwise assemble from DB_USERNAME/DB_PASSWORD with an interactive prompt fallback.
if [ -z "$DATABASE_URL" ]; then
    : "${DB_USERNAME:=}"
    : "${DB_PASSWORD:=}"
    if [ -z "$DB_USERNAME" ]; then
        read -p "Enter PostgreSQL admin username for ${DB_SERVER_NAME}: " DB_USERNAME
    fi
    if [ -z "$DB_PASSWORD" ]; then
        read -s -p "Enter password for ${DB_USERNAME}@${DB_SERVER_NAME}: " DB_PASSWORD
        echo
    fi
    DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"
fi

# Set DATABASE_URL
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        DATABASE_URL="$DATABASE_URL"

print_success "App settings configured with PostgreSQL"

APP_URL="https://${APP_NAME}.azurewebsites.net"

verify_deployment() {
    print_section "Verifying Deployment"
    
    print_info "Waiting for application to start..."
    sleep 30
    
    # Check if the app is responding
    if curl -s --max-time 30 "$APP_URL" > /dev/null; then
        print_success "Application is responding"
        
        # Test database connection
        print_info "Testing database connectivity..."
        if curl -f -s --max-time 30 "$APP_URL/api/health" > /dev/null; then
            print_success "Health endpoint accessible"
            
            # Test PostgreSQL connection
            if curl -f -s --max-time 30 "$APP_URL/api/evaluations" > /dev/null; then
                print_success "PostgreSQL database connection verified"
            else
                print_warning "Database connection may have issues - check logs"
            fi
        else
            print_warning "Health endpoint not responding - application may still be starting"
        fi
    else
        print_warning "Application may still be starting up"
        print_info "Manual verification:"
        echo "  • Application: $APP_URL"
        echo "  • Health check: curl $APP_URL/api/health"
        echo "  • Database test: curl $APP_URL/api/evaluations"
    fi
}

cleanup() {
    print_section "Cleanup"
    
    # Remove deployment zip
    if [ -f "$DEPLOY_ZIP" ]; then
        rm "$DEPLOY_ZIP"
        print_success "Deployment package cleaned up"
    fi
}

show_summary() {
    print_section "Deployment Summary"
    
    echo -e "${GREEN}🎉 PostgreSQL backend deployment completed!${NC}"
    echo ""
    echo -e "${CYAN}Application Details:${NC}"
    echo "  • Name: $APP_NAME"
    echo "  • Resource Group: $RESOURCE_GROUP"
    echo "  • URL: $APP_URL"
    echo "  • Database: PostgreSQL (${DB_SERVER_NAME})"
    echo ""
    echo -e "${CYAN}Useful Links:${NC}"
    echo "  • Application: $APP_URL"
    echo "  • Azure Portal: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME"
    echo "  • Live Logs: https://$APP_NAME.scm.azurewebsites.net/api/logstream"
    echo "  • Kudu Console: https://$APP_NAME.scm.azurewebsites.net"
    echo ""
    echo -e "${BLUE}📊 Next Steps:${NC}"
    echo "  1. Visit: $APP_URL"
    echo "  2. App will auto-migrate PostgreSQL database on startup"
    echo "  3. Test data scientist workflow: $APP_URL/data-scientist"
    echo "  4. Monitor logs for any issues"
    echo ""
    echo -e "${YELLOW}Note: It may take a few minutes for the application to fully start.${NC}"
}

# Restart the application
print_info "Restarting application..."
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

# Run verification and show summary
verify_deployment
show_summary
cleanup

print_success "PostgreSQL backend deployment script completed"
