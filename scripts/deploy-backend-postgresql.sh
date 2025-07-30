#!/bin/bash
# scripts/deploy-backend-postgresql.sh
# PostgreSQL Backend Deployment to Sweden Central

set -e
trap 'echo "❌ Error occurred at line $LINENO. Exiting..."; exit 1' ERR

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Backend-specific configuration for Sweden Central
readonly APP_NAME="human-eval-backend"
readonly RESOURCE_GROUP="human-eval-backend-rg"
readonly LOCATION="swedencentral"  # Sweden Central region
readonly PLAN_NAME="ASP-humaneval-backend-plan"
readonly DB_SERVER_NAME="human-eval-db-server"
readonly DB_NAME="humanevaldb"
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly DEPLOY_ZIP="deployment_backend_${TIMESTAMP}.zip"

print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 Human Evaluation Builder                         ║${NC}"
    echo -e "${CYAN}║                 BACKEND/PostgreSQL Deployment                    ║${NC}"
    echo -e "${CYAN}║                     Sweden Central Region                        ║${NC}"
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

print_section "Verifying Resource Group"

# Check if resource group exists
if az group show --name $RESOURCE_GROUP &>/dev/null; then
    print_success "Resource group '$RESOURCE_GROUP' exists"
else
    echo -e "${RED}❌ Resource group '$RESOURCE_GROUP' not found${NC}"
    echo "Please create it first with:"
    echo "az group create --name $RESOURCE_GROUP --location $LOCATION"
    exit 1
fi

print_section "Creating PostgreSQL Flexible Server"

# Generate secure password
DB_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

print_info "Creating PostgreSQL Flexible Server in Sweden Central..."

az postgres flexible-server create \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER_NAME \
    --location $LOCATION \
    --admin-user dbadmin \
    --admin-password $DB_ADMIN_PASSWORD \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --public-access 0.0.0.0 \
    --storage-size 32 \
    --version 14

print_success "PostgreSQL server created in Sweden Central"

print_section "Creating Database"

# Create database
az postgres flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $DB_SERVER_NAME \
    --database-name $DB_NAME

print_success "Database '$DB_NAME' created"

print_section "Configuring Firewall Rules"

# Allow Azure services access
az postgres flexible-server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER_NAME \
    --rule-name "AllowAzureServices" \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0

print_success "Firewall rules configured"

print_section "Creating App Service Plan"

az appservice plan create \
    --name $PLAN_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux

print_success "App Service Plan created in Sweden Central"

print_section "Creating Web App"

az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --name $APP_NAME \
    --runtime "NODE:22-lts"

print_success "Web App '$APP_NAME' created"

print_section "Configuring App Settings"

# Construct database connection string
DATABASE_URL="postgresql://dbadmin:${DB_ADMIN_PASSWORD}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        USE_POSTGRESQL=true \
        DATABASE_URL="$DATABASE_URL" \
        AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
        AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
        AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
        NODE_ENV=production \
        SCM_DO_BUILD_DURING_DEPLOYMENT=true \
        WEBSITE_NODE_DEFAULT_VERSION="22-lts" \
        WEBSITE_RUN_FROM_PACKAGE=1

print_success "App settings configured"

print_section "Building Application"

# Install dependencies
print_info "Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
print_info "Building Next.js application..."
npm run build

print_success "Application built successfully"

print_section "Creating Deployment Package"

# Create deployment package
print_info "Creating deployment package..."
zip -r $DEPLOY_ZIP . \
    -x "node_modules/*" \
    -x ".git/*" \
    -x "*.log" \
    -x ".env*" \
    -x "__tests__/*" \
    -x "docs/*" \
    -x "scripts/test-*" \
    -x "*.md"

print_success "Deployment package created: $DEPLOY_ZIP"

print_section "Deploying to Azure"

# Deploy to Azure
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src $DEPLOY_ZIP

print_success "Application deployed to Azure"

print_section "Setting up Database Schema"

print_info "Waiting for app to start..."
sleep 30

# Test the deployment
APP_URL="https://${APP_NAME}.azurewebsites.net"
print_info "Testing deployment at $APP_URL"

print_section "Deployment Complete"

echo ""
echo -e "${GREEN}🎉 Backend deployment to Sweden Central successful!${NC}"
echo ""
echo -e "${CYAN}📋 Deployment Details:${NC}"
echo "  • Resource Group: $RESOURCE_GROUP"
echo "  • Region: Sweden Central"
echo "  • App Name: $APP_NAME"
echo "  • App URL: $APP_URL"
echo "  • Database Server: $DB_SERVER_NAME"
echo "  • Database Name: $DB_NAME"
echo "  • Database Location: Sweden Central"
echo ""
echo -e "${YELLOW}🔐 Database Credentials:${NC}"
echo "  • Admin User: dbadmin"
echo "  • Admin Password: $DB_ADMIN_PASSWORD"
echo -e "${RED}⚠️  Save these credentials securely!${NC}"
echo ""
echo -e "${BLUE}📊 Next Steps:${NC}"
echo "  1. Visit: $APP_URL"
echo "  2. Run database migrations if needed"
echo "  3. Test the application functionality"
echo ""

# Cleanup
rm -f $DEPLOY_ZIP

print_success "Deployment script completed successfully"
