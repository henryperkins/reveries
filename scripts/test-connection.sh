#!/bin/bash

# Database connection test utility
# Tests connection to PostgreSQL (local Docker or Azure)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Reveries Database Connection Test${NC}"
echo ""

# Function to test connection
test_connection() {
    local host=$1
    local user=$2
    local database=$3
    local port=${4:-5432}
    local label=$5

    echo -e "${YELLOW}Testing $label connection...${NC}"
    echo "Host: $host"
    echo "User: $user"
    echo "Database: $database"
    echo "Port: $port"
    echo ""

    if PGPASSWORD="$PGPASSWORD" psql -h "$host" -U "$user" -d "$database" -p "$port" -c "SELECT version(), current_database(), current_user, now();" 2>/dev/null; then
        echo -e "${GREEN}✅ $label connection successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ $label connection failed${NC}"
        return 1
    fi
}

# Test 1: Check if environment variables are set
echo -e "${YELLOW}📋 Environment Variables:${NC}"
echo "PGHOST: ${PGHOST:-'not set'}"
echo "PGUSER: ${PGUSER:-'not set'}"
echo "PGDATABASE: ${PGDATABASE:-'not set'}"
echo "PGPORT: ${PGPORT:-'not set'}"
echo "PGPASSWORD: ${PGPASSWORD:+'set'}${PGPASSWORD:-'not set'}"
echo ""

if [ -n "$PGHOST" ] && [ -n "$PGUSER" ] && [ -n "$PGDATABASE" ] && [ -n "$PGPASSWORD" ]; then
    test_connection "$PGHOST" "$PGUSER" "$PGDATABASE" "$PGPORT" "Current Environment"
    echo ""
fi

# Test 2: Try local Docker connection
echo -e "${YELLOW}🐳 Testing Local Docker PostgreSQL...${NC}"
if test_connection "localhost" "reveries_user" "reveries_db" "5432" "Local Docker"; then
    echo -e "${GREEN}Local Docker database is available${NC}"
else
    echo -e "${YELLOW}Local Docker database not available (may not be running)${NC}"
fi
echo ""

# Test 3: Try Azure PostgreSQL (if credentials provided)
if [ -n "$PGHOST" ] && [[ "$PGHOST" == *"postgres.database.azure.com"* ]]; then
    echo -e "${YELLOW}☁️  Testing Azure PostgreSQL Flexible Server...${NC}"
    if test_connection "$PGHOST" "$PGUSER" "$PGDATABASE" "$PGPORT" "Azure PostgreSQL"; then
        echo -e "${GREEN}Azure PostgreSQL is available${NC}"

        # Additional Azure-specific tests
        echo -e "${YELLOW}🔒 Testing SSL connection...${NC}"
        if PGPASSWORD="$PGPASSWORD" psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE?sslmode=require" -c "SELECT 'SSL connection successful';" 2>/dev/null; then
            echo -e "${GREEN}✅ SSL connection working${NC}"
        else
            echo -e "${RED}❌ SSL connection failed${NC}"
        fi

        # Check Azure PostgreSQL version and features
        echo -e "${YELLOW}📊 Azure PostgreSQL Details:${NC}"
        PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -t -c "
        SELECT
            'Version: ' || version(),
            'Current Time: ' || now(),
            'Database Size: ' || pg_size_pretty(pg_database_size(current_database())),
            'Extensions Available: ' || count(*) FROM pg_available_extensions;
        " 2>/dev/null | sed 's/^[ \t]*//' | sed '/^$/d'

    else
        echo -e "${RED}Azure PostgreSQL connection failed${NC}"
        echo -e "${YELLOW}Troubleshooting tips:${NC}"
        echo "1. Check if your IP is whitelisted in Azure firewall rules"
        echo "2. Verify the connection string is correct"
        echo "3. Ensure the database exists"
        echo "4. Check if the user has proper permissions"
    fi
    echo ""
fi

# Test 4: Application configuration test
echo -e "${YELLOW}⚙️  Testing Application Configuration...${NC}"

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local file found${NC}"

    # Source .env.local and test
    set -a
    source .env.local
    set +a

    if [ -n "$VITE_DB_HOST" ] && [ -n "$VITE_DB_USER" ] && [ -n "$VITE_DB_NAME" ] && [ -n "$VITE_DB_PASSWORD" ]; then
        echo -e "${GREEN}✅ App environment variables configured${NC}"

        echo -e "${YELLOW}Testing app database connection...${NC}"
        if PGPASSWORD="$VITE_DB_PASSWORD" psql -h "$VITE_DB_HOST" -U "$VITE_DB_USER" -d "$VITE_DB_NAME" -p "${VITE_DB_PORT:-5432}" -c "SELECT 'App connection successful';" 2>/dev/null; then
            echo -e "${GREEN}✅ App database connection successful${NC}"
        else
            echo -e "${RED}❌ App database connection failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Some app environment variables missing${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
    echo "Copy .env.example to .env.local and configure your database settings"
fi

echo ""
echo -e "${BLUE}🎯 Summary and Recommendations:${NC}"
echo ""

# Docker recommendation
if docker ps --format 'table {{.Names}}' | grep -q "reveries-postgres"; then
    echo -e "${GREEN}✅ Docker PostgreSQL container is running${NC}"
else
    echo -e "${YELLOW}💡 To start local Docker PostgreSQL:${NC}"
    echo "   docker-compose up -d postgres"
fi

# Azure recommendation
if [ -n "$PGHOST" ] && [[ "$PGHOST" == *"postgres.database.azure.com"* ]]; then
    echo -e "${BLUE}💡 For Azure PostgreSQL:${NC}"
    echo "   - Ensure firewall rules allow your IP"
    echo "   - Use SSL connections (sslmode=require)"
    echo "   - Monitor connection limits and performance"
fi

echo ""
echo -e "${GREEN}🚀 Ready to run: npm run dev${NC}"
