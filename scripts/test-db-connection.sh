#!/bin/bash
# Test PostgreSQL database connection from local machine

set -e

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

readonly DB_SERVER_NAME="human-eval-db-server"
readonly DB_NAME="humanevaldb"
readonly DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"

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

print_section "PostgreSQL Database Connection Test"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_info "psql not found. Installing PostgreSQL client..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install postgresql
    else
        echo "Please install PostgreSQL client (psql) for your system"
        exit 1
    fi
fi

print_info "Database details:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: dbadmin"

print_info "Testing connection..."
echo "You will be prompted for the database password (HumanEval2025!)"

# Test connection
if psql "postgresql://dbadmin@${DB_HOST}:5432/${DB_NAME}?sslmode=require" -c "SELECT version();" 2>/dev/null; then
    print_success "Database connection successful"
    
    print_info "Checking tables..."
    psql "postgresql://dbadmin@${DB_HOST}:5432/${DB_NAME}?sslmode=require" -c "\dt"
    
    print_info "Checking evaluations table..."
    psql "postgresql://dbadmin@${DB_HOST}:5432/${DB_NAME}?sslmode=require" -c "SELECT COUNT(*) as evaluation_count FROM evaluations;"
    
else
    print_error "Database connection failed"
    echo ""
    echo "Possible issues:"
    echo "1. Database server is not running"
    echo "2. Wrong credentials"
    echo "3. Firewall rules blocking connection"
    echo "4. SSL certificate issues"
fi
