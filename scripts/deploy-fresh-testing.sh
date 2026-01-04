#!/bin/bash
# Fresh deployment script for Human Evaluation Builder (2025)
# This script creates a clean, optimized deployment for Azure App Service

# Script configuration
set -e
trap 'echo "❌ Error occurred at line $LINENO. Exiting..."; exit 1' ERR

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration - designed to avoid naming collisions
readonly APP_NAME="human-eval-testing"
readonly RESOURCE_GROUP="human-eval-testing-rg"  
readonly LOCATION="eastus2"  # Major region, likely different from production
readonly PLAN_NAME="ASP-humanevaltestingrg-8fdc"
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly DEPLOY_ZIP="deployment_testing_${TIMESTAMP}.zip"

# Print functions
print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 Human Evaluation Builder                         ║${NC}"
    echo -e "${CYAN}║                 TESTING Deployment Script                        ║${NC}" 
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation functions
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not found. Please install Azure CLI first."
        echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node -v)"
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
    
    # Check for environment file
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found"
        print_info "Creating template .env.local file..."
        create_env_template
    else
        print_success ".env.local file found"
    fi
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
    echo -e "${YELLOW}Deployment Target:${NC}"
    echo "  • Resource Group: $RESOURCE_GROUP"
    echo "  • App Name: $APP_NAME"
    echo "  • Location: $LOCATION"
    echo ""
    
    # Confirm with user
    read -p "Is this the correct subscription for deployment? (y/N): " -n 1 -r
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

create_env_template() {
    cat > .env.local << 'EOF'
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT=your_deployment_name

# Application Settings
NEXT_PUBLIC_APP_URL=https://human-eval-builder-test.azurewebsites.net
NODE_ENV=production

# Optional: Use fallback analysis if Azure OpenAI is unavailable
USE_FALLBACK_ANALYSIS=false
EOF
    print_info "Please update .env.local with your Azure OpenAI credentials before continuing"
    read -p "Press Enter after updating .env.local file..."
}

# Build functions
clean_build() {
    print_section "Cleaning Previous Build"
    
    # Remove previous builds and caches
    rm -rf .next
    rm -rf node_modules/.cache
    rm -rf deployment_*.zip
    
    print_success "Build directory cleaned"
}

install_dependencies() {
    print_section "Installing Dependencies"
    
    # Install with legacy peer deps for compatibility
    npm ci --legacy-peer-deps --production=false
    
    print_success "Dependencies installed"
}

build_application() {
    print_section "Building Next.js Application"
    
    # Set production environment for build
    export NODE_ENV=production
    
    # Run Next.js build
    npm run build
    
    # Verify build output
    if [ ! -d ".next" ]; then
        print_error "Build failed - .next directory not found"
        exit 1
    fi
    
    print_success "Application built successfully"
}

# Package functions
create_deployment_package() {
    print_section "Creating Deployment Package"
    
    # Create temporary deployment directory
    local temp_dir=$(mktemp -d)
    print_info "Deployment staging directory: $temp_dir"
    
    # Copy essential files for Next.js standalone deployment
    print_info "Copying application files..."
    
    # Core Next.js files
    cp -r .next "$temp_dir/"
    cp -r public "$temp_dir/" 2>/dev/null || mkdir "$temp_dir/public"
    
    # Application source (needed for server components)
    cp -r app "$temp_dir/" 2>/dev/null || true
    cp -r lib "$temp_dir/" 2>/dev/null || true
    cp -r components "$temp_dir/" 2>/dev/null || true
    
    # Configuration files
    cp next.config.mjs "$temp_dir/" 2>/dev/null || true
    cp tsconfig.json "$temp_dir/" 2>/dev/null || true
    cp postcss.config.mjs "$temp_dir/" 2>/dev/null || true
    cp tailwind.config.ts "$temp_dir/" 2>/dev/null || true
    
    # Server files
    cp server.js "$temp_dir/"
    
    # Install production dependencies in temp directory
    print_info "Installing production dependencies..."
    cd "$temp_dir"
    
    # Create production package.json first
    create_production_package_json "$temp_dir"
    
    # Install dependencies
    npm install --production --no-optional --no-fund --no-audit
    
    cd - > /dev/null
    
    # Azure configuration
    create_azure_configs "$temp_dir"
    
    # Environment file
    create_production_env "$temp_dir"
    
    # Create deployment zip
    print_info "Creating deployment archive..."
    cd "$temp_dir"
    zip -r "../$DEPLOY_ZIP" . -x "*.DS_Store" ".git/*" "*.log" "node_modules/.cache/*"
    cd - > /dev/null
    
    # Move zip to current directory
    mv "$temp_dir/../$DEPLOY_ZIP" "./$DEPLOY_ZIP"
    
    # Clean up temp directory
    rm -rf "$temp_dir"
    
    print_success "Deployment package created: $DEPLOY_ZIP"
}

create_azure_configs() {
    local deploy_dir="$1"
    
    # Create web.config for Azure App Service
    cat > "$deploy_dir/web.config" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="DynamicContent">
          <match url="/*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="104857600" />
      </requestFiltering>
    </security>
    <iisnode node_env="production" />
  </system.webServer>
</configuration>
EOF

    # Create startup script
    cat > "$deploy_dir/startup.sh" << 'EOF'
#!/bin/bash
echo "Starting Human Evaluation Builder..."
echo "Node version: $(node --version)"
echo "Environment: $NODE_ENV"
echo "Port: $WEBSITES_PORT"
node server.js
EOF
    chmod +x "$deploy_dir/startup.sh"
}

create_production_package_json() {
    local deploy_dir="$1"
    
    cat > "$deploy_dir/package.json" << 'EOF'
{
  "name": "human-evaluation-builder",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "next": "15.5.9",
    "react": "19.1.2",
    "react-dom": "19.1.2",
    "dotenv": "^16.5.0",
    "@ai-sdk/azure": "^1.3.23",
    "ai": "latest",
    "zod": "latest"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF
}

create_production_env() {
    local deploy_dir="$1"
    
    # Extract values from .env.local (if they exist)
    local azure_key=$(grep "AZURE_OPENAI_API_KEY=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local azure_endpoint=$(grep "AZURE_OPENAI_ENDPOINT=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local azure_version=$(grep "AZURE_OPENAI_API_VERSION=" .env.local 2>/dev/null | cut -d= -f2- || echo "2024-02-15-preview")
    local azure_deployment=$(grep "AZURE_OPENAI_DEPLOYMENT=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local use_fallback=$(grep "USE_FALLBACK_ANALYSIS=" .env.local 2>/dev/null | cut -d= -f2- || echo "false")
    
    cat > "$deploy_dir/.env.production" << EOF
# Production Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://$APP_NAME.azurewebsites.net

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=$azure_key
AZURE_OPENAI_ENDPOINT=$azure_endpoint
AZURE_OPENAI_API_VERSION=$azure_version
AZURE_OPENAI_DEPLOYMENT=$azure_deployment

# Fallback Configuration
USE_FALLBACK_ANALYSIS=$use_fallback

# Azure App Service Configuration
WEBSITES_PORT=8080
PORT=8080
EOF
}

# Azure deployment functions
create_azure_resources() {
    print_section "Creating Azure Resources"
    
    # Check if resource group exists
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_info "Creating resource group: $RESOURCE_GROUP"
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
        print_success "Resource group created"
    else
        print_success "Resource group already exists"
    fi
    
    # Check if app service plan exists
    if ! az appservice plan show --name "$PLAN_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_info "Creating App Service plan: $PLAN_NAME"
        az appservice plan create \
            --name "$PLAN_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --sku B1 \
            --is-linux
        print_success "App Service plan created"
    else
        print_success "App Service plan already exists"
    fi
    
    # Check if web app exists
    if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_info "Creating Web App: $APP_NAME"
        az webapp create \
            --name "$APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --plan "$PLAN_NAME" \
            --runtime "NODE:22-lts"
        print_success "Web App created"
    else
        print_success "Web App already exists"
    fi
}

configure_app_settings() {
    print_section "Configuring App Settings"
    
    # Extract environment variables
    local azure_key=$(grep "AZURE_OPENAI_API_KEY=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local azure_endpoint=$(grep "AZURE_OPENAI_ENDPOINT=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local azure_version=$(grep "AZURE_OPENAI_API_VERSION=" .env.local 2>/dev/null | cut -d= -f2- || echo "2024-02-15-preview")
    local azure_deployment=$(grep "AZURE_OPENAI_DEPLOYMENT=" .env.local 2>/dev/null | cut -d= -f2- || echo "")
    local use_fallback=$(grep "USE_FALLBACK_ANALYSIS=" .env.local 2>/dev/null | cut -d= -f2- || echo "false")
    
    print_info "Setting application configuration..."
    az webapp config appsettings set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings \
            SCM_DO_BUILD_DURING_DEPLOYMENT="false" \
            ENABLE_ORYX_BUILD="false" \
            WEBSITE_RUN_FROM_PACKAGE="1" \
            NODE_ENV="production" \
            WEBSITES_PORT="8080" \
            PORT="8080" \
            AZURE_OPENAI_API_KEY="$azure_key" \
            AZURE_OPENAI_ENDPOINT="$azure_endpoint" \
            AZURE_OPENAI_API_VERSION="$azure_version" \
            AZURE_OPENAI_DEPLOYMENT="$azure_deployment" \
            USE_FALLBACK_ANALYSIS="$use_fallback" \
            NEXT_PUBLIC_APP_URL="https://$APP_NAME.azurewebsites.net"
    
    print_success "App settings configured"
}

deploy_application() {
    print_section "Deploying Application"
    
    print_info "Uploading deployment package..."
    az webapp deployment source config-zip \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --src "$DEPLOY_ZIP"
    
    print_info "Restarting application..."
    az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"
    
    print_success "Application deployed successfully"
}

# Post-deployment functions
verify_deployment() {
    print_section "Verifying Deployment"
    
    local app_url="https://$APP_NAME.azurewebsites.net"
    
    print_info "Waiting for application to start..."
    sleep 30
    
    # Check if the app is responding
    if curl -s --max-time 30 "$app_url" > /dev/null; then
        print_success "Application is responding"
    else
        print_warning "Application may still be starting up"
    fi
    
    print_info "Application URL: $app_url"
    print_info "Logs: https://$APP_NAME.scm.azurewebsites.net/api/logstream"
    print_info "Kudu: https://$APP_NAME.scm.azurewebsites.net"
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
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}Application Details:${NC}"
    echo "  • Name: $APP_NAME"
    echo "  • Resource Group: $RESOURCE_GROUP"
    echo "  • URL: https://$APP_NAME.azurewebsites.net"
    echo ""
    echo -e "${CYAN}Useful Links:${NC}"
    echo "  • Application: https://$APP_NAME.azurewebsites.net"
    echo "  • Azure Portal: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME"
    echo "  • Live Logs: https://$APP_NAME.scm.azurewebsites.net/api/logstream"
    echo "  • Kudu Console: https://$APP_NAME.scm.azurewebsites.net"
    echo ""
    echo -e "${YELLOW}Note: It may take a few minutes for the application to fully start.${NC}"
}

# Main execution
main() {
    print_banner
    
    check_prerequisites
    clean_build
    install_dependencies
    build_application
    create_deployment_package
    
    # Ask user if they want to deploy
    echo ""
    read -p "Deploy to Azure now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_azure_resources
        configure_app_settings
        deploy_application
        verify_deployment
        show_summary
    else
        print_info "Deployment package created: $DEPLOY_ZIP"
        print_info "You can deploy later using Azure CLI or the Azure Portal"
    fi
    
    cleanup
    
    print_success "Script completed!"
}

# Run main function
main "$@"