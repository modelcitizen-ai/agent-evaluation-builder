#!/bin/bash
# Diagnostic script for live PostgreSQL backend application

set -e

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly APP_NAME="human-eval-backend"
readonly APP_URL="https://human-eval-backend-gnc0e4ejgxbeapdu.eastus2-01.azurewebsites.net"

print_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo "────────────────────────────────────────────────────────────────────"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_section "Diagnosing Live PostgreSQL Backend Application"
echo "Application URL: $APP_URL"

# Test 1: Basic connectivity
print_section "Test 1: Basic Application Connectivity"
if curl -s --max-time 30 "$APP_URL" > /dev/null; then
    print_success "Application is responding"
else
    print_error "Application is not responding"
    exit 1
fi

# Test 2: Health endpoint
print_section "Test 2: Health Endpoint Check"
print_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s --max-time 30 "$APP_URL/api/health" 2>/dev/null || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == "FAILED" ]]; then
    print_error "Health endpoint not responding"
else
    print_success "Health endpoint responding"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test 3: Database connection test
print_section "Test 3: Database Connection Test"
print_info "Testing database connection via API..."
DB_RESPONSE=$(curl -s --max-time 30 "$APP_URL/api/evaluations" 2>/dev/null || echo "FAILED")

if [[ "$DB_RESPONSE" == "FAILED" ]]; then
    print_error "Database API not responding"
else
    print_success "Database API responding"
    echo "Response (first 200 chars): ${DB_RESPONSE:0:200}..."
fi

# Test 4: Create evaluation test
print_section "Test 4: Create Evaluation Test"
print_info "Attempting to create a test evaluation..."

TEST_PAYLOAD=$(cat << 'EOF'
{
  "name": "Diagnostic Test Evaluation",
  "instructions": "This is a diagnostic test to verify PostgreSQL backend functionality",
  "status": "draft",
  "criteria": [
    {
      "id": 1,
      "name": "Test Criterion",
      "description": "Test criterion for diagnostic purposes",
      "type": "scale",
      "scale": {"min": 1, "max": 5}
    }
  ],
  "originalData": [
    {"id": 1, "text": "Test item 1", "type": "text"},
    {"id": 2, "text": "Test item 2", "type": "text"}
  ],
  "totalItems": 2
}
EOF
)

CREATE_RESPONSE=$(curl -s --max-time 30 -X POST \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD" \
    "$APP_URL/api/evaluations" 2>/dev/null || echo "FAILED")

if [[ "$CREATE_RESPONSE" == "FAILED" ]]; then
    print_error "Failed to create evaluation via API"
else
    echo "Create response: $CREATE_RESPONSE"
    if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
        print_success "Successfully created evaluation"
    else
        print_error "Evaluation creation returned error"
        echo "Error details: $CREATE_RESPONSE"
    fi
fi

# Test 5: List evaluations after creation
print_section "Test 5: List Evaluations After Creation"
print_info "Fetching evaluations to verify creation..."
FINAL_LIST=$(curl -s --max-time 30 "$APP_URL/api/evaluations" 2>/dev/null || echo "FAILED")

if [[ "$FINAL_LIST" == "FAILED" ]]; then
    print_error "Failed to fetch evaluations"
else
    echo "Final evaluation list: $FINAL_LIST"
    EVAL_COUNT=$(echo "$FINAL_LIST" | grep -o '"id"' | wc -l)
    print_info "Total evaluations found: $EVAL_COUNT"
fi

print_section "Diagnostic Summary"
echo "🔍 Next steps if issues found:"
echo "1. Check Azure App Service logs: az webapp log tail --name $APP_NAME --resource-group human-eval-backend-rg"
echo "2. Check environment variables: az webapp config appsettings list --name $APP_NAME --resource-group human-eval-backend-rg"
echo "3. Test database connection directly"
echo "4. Restart the application: az webapp restart --name $APP_NAME --resource-group human-eval-backend-rg"
