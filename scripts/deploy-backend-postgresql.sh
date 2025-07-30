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

# Backend configuration - mirrors localStorage deployment
readonly APP_NAME="human-eval-backend"
readonly RESOURCE_GROUP="human-eval-backend-rg"
readonly LOCATION="swedencentral"
readonly PLAN_NAME="ASP-humaneval-backend-plan"
readonly DB_SERVER_NAME="human-eval-db-server"
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

print_section "Building Application"

# Install dependencies and build (same as localStorage version)
print_info "Installing dependencies..."
npm install --legacy-peer-deps

print_info "Building Next.js application..."
npm run build

print_success "Application built successfully"

print_section "Creating Deployment Package"

# Create deployment package (same as localStorage version)
print_info "Creating deployment package..."
zip -r $DEPLOY_ZIP . \
    -x "node_modules/*" \
    -x ".git/*" \
    -x "*.log" \
    -x ".env*" \
    -x "__tests__/*" \
    -x "docs/*" \
    -x "*.md"

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

# Set PostgreSQL environment variables
print_info "Configuring PostgreSQL environment variables..."

az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        USE_POSTGRESQL=true \
        AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
        AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
        AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
        NODE_ENV=production

print_success "App settings configured"

print_section "Testing Deployment"

APP_URL="https://${APP_NAME}.azurewebsites.net"
print_info "Waiting for app to restart..."
sleep 30

print_info "Testing deployment at $APP_URL/health"

# Simple health check
if curl -f -s "$APP_URL/health" > /dev/null; then
    print_success "Application is healthy and ready"
else
    print_warning "Health check failed, but deployment completed"
    print_info "Check the app manually at $APP_URL"
fi

print_section "Deployment Complete"

echo ""
echo -e "${GREEN}🎉 PostgreSQL backend deployment successful!${NC}"
echo ""
echo -e "${CYAN}📋 Deployment Details:${NC}"
echo "  • App Name: $APP_NAME"
echo "  • App URL: $APP_URL"
echo "  • Resource Group: $RESOURCE_GROUP"
echo "  • Database: PostgreSQL (configure DATABASE_URL separately)"
echo ""
echo -e "${BLUE}� Next Steps:${NC}"
echo "  1. Set DATABASE_URL in Azure App Service settings"
echo "  2. Visit: $APP_URL"
echo "  3. App will auto-migrate database on startup"
echo ""

# Cleanup
rm -f $DEPLOY_ZIP

print_success "Deployment script completed"
