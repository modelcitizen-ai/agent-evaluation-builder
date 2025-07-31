#!/bin/bash
# Check Azure App Service logs for PostgreSQL backend

set -e

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

readonly APP_NAME="human-eval-backend"
readonly RESOURCE_GROUP="human-eval-backend-rg"

print_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo "────────────────────────────────────────────────────────────────────"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_section "Azure App Service Logs Check"

print_info "Checking if logged in to Azure..."
if ! az account show &> /dev/null; then
    echo "Not logged in to Azure. Please run: az login"
    exit 1
fi

print_info "Getting recent application logs..."
echo ""
echo "==================== RECENT APPLICATION LOGS ===================="
az webapp log show --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

print_info "Getting deployment logs..."
echo ""
echo "==================== DEPLOYMENT LOGS ===================="
az webapp log deployment show --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

print_info "Checking current app settings..."
echo ""
echo "==================== APP SETTINGS ===================="
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

print_info "Checking app service status..."
echo ""
echo "==================== APP SERVICE STATUS ===================="
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "{name:name,state:state,hostNames:hostNames,ftpPublishingUrl:ftpPublishingUrl}" --output table

echo ""
print_info "To stream live logs, run:"
echo "az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
