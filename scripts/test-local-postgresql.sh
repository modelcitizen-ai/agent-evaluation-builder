#!/bin/bash
# Quick local PostgreSQL testing setup for Human Evaluation Builder

set -e

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

echo ""
echo -e "${BLUE}🐘 Human Evaluation Builder - Local PostgreSQL Setup${NC}"
echo "════════════════════════════════════════════════════════════"

# Check if we're on the backend branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "backend" ]; then
    echo -e "${RED}❌ Must be on 'backend' branch for PostgreSQL testing${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Run: git checkout backend"
    exit 1
fi

echo -e "${GREEN}✅ On backend branch${NC}"

# Check if PostgreSQL is running
if command -v psql >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL client installed${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found${NC}"
    echo "Install with: brew install postgresql@14"
fi

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local found${NC}"
    
    # Check if it has PostgreSQL config
    if grep -q "USE_POSTGRESQL=true" .env.local; then
        echo -e "${GREEN}✅ PostgreSQL mode enabled in .env.local${NC}"
    else
        echo -e "${YELLOW}⚠️  Add USE_POSTGRESQL=true to .env.local${NC}"
    fi
    
    if grep -q "DATABASE_URL=" .env.local; then
        echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Add DATABASE_URL to .env.local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Create .env.local from .env.local.example${NC}"
    echo "Run: cp .env.local.example .env.local"
fi

echo ""
echo -e "${BLUE}📋 Quick Setup Commands:${NC}"
echo ""
echo "1. Install PostgreSQL (if needed):"
echo -e "${YELLOW}   brew install postgresql@14${NC}"
echo -e "${YELLOW}   brew services start postgresql@14${NC}"
echo ""
echo "2. Create database:"
echo -e "${YELLOW}   createdb human_eval_test${NC}"
echo ""
echo "3. Configure environment:"
echo -e "${YELLOW}   cp .env.local.example .env.local${NC}"
echo -e "${YELLOW}   # Edit .env.local with your Azure OpenAI credentials${NC}"
echo ""
echo "4. Start development:"
echo -e "${YELLOW}   npm run dev${NC}"
echo ""
echo -e "${BLUE}🐳 Or use Docker:${NC}"
echo -e "${YELLOW}   docker run --name postgres-dev -e POSTGRES_PASSWORD=password -e POSTGRES_DB=human_eval_test -p 5432:5432 -d postgres:14${NC}"
echo ""

# Test database connection if .env.local exists
if [ -f ".env.local" ] && grep -q "DATABASE_URL=" .env.local; then
    DATABASE_URL=$(grep "DATABASE_URL=" .env.local | cut -d'=' -f2)
    echo -e "${BLUE}🔍 Testing database connection...${NC}"
    
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful!${NC}"
            echo -e "${GREEN}🎉 Ready to run: npm run dev${NC}"
        else
            echo -e "${YELLOW}⚠️  Database connection failed${NC}"
            echo "Make sure PostgreSQL is running and database exists"
        fi
    fi
fi

echo ""
echo -e "${BLUE}📖 Full setup guide: LOCAL_POSTGRESQL_SETUP.md${NC}"
