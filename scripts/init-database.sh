#!/bin/bash

# Database initialization script for both local and Azure PostgreSQL
# This script can be run against local Docker PostgreSQL or Azure PostgreSQL Flexible Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Reveries Database Initialization${NC}"

# Check if environment variables are set
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ] || [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}❌ Error: Required environment variables not set${NC}"
    echo "Please set: PGHOST, PGUSER, PGDATABASE, PGPASSWORD"
    echo ""
    echo "For Azure PostgreSQL:"
    echo "export PGHOST=reveriesdb.postgres.database.azure.com"
    echo "export PGUSER=hperkins"
    echo "export PGPORT=5432"
    echo "export PGDATABASE=reveries"
    echo "export PGPASSWORD=your-password"
    echo ""
    echo "For local Docker:"
    echo "export PGHOST=localhost"
    echo "export PGUSER=reveries_user"
    echo "export PGPORT=5432"
    echo "export PGDATABASE=reveries_db"
    echo "export PGPASSWORD=reveries_password"
    exit 1
fi

# Set default port if not specified
PGPORT=${PGPORT:-5432}

echo -e "${YELLOW}📊 Connection Details:${NC}"
echo "Host: $PGHOST"
echo "User: $PGUSER"
echo "Database: $PGDATABASE"
echo "Port: $PGPORT"
echo ""

# Test connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please check your connection details and ensure the database server is accessible."
    exit 1
fi

# Check if tables already exist
echo -e "${YELLOW}🔍 Checking existing schema...${NC}"
TABLE_COUNT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'research_sessions', 'research_steps', 'research_sources', 'graph_nodes', 'graph_edges', 'function_calls');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found existing tables. Do you want to recreate the schema? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  Dropping existing tables...${NC}"
        psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -c "
        DROP TABLE IF EXISTS function_calls CASCADE;
        DROP TABLE IF EXISTS graph_edges CASCADE;
        DROP TABLE IF EXISTS graph_nodes CASCADE;
        DROP TABLE IF EXISTS research_sources CASCADE;
        DROP TABLE IF EXISTS research_steps CASCADE;
        DROP TABLE IF EXISTS research_sessions CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP VIEW IF EXISTS session_summary CASCADE;
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        "
        echo -e "${GREEN}✅ Existing tables dropped${NC}"
    else
        echo -e "${GREEN}ℹ️  Skipping schema recreation${NC}"
        exit 0
    fi
fi

# Create schema
echo -e "${YELLOW}📋 Creating database schema...${NC}"
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -f "src/database/init/01-init.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create schema${NC}"
    exit 1
fi

# Insert sample data (optional)
echo -e "${YELLOW}📊 Do you want to insert sample data? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📊 Inserting sample data...${NC}"
    psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -f "src/database/init/02-sample-data.sql"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sample data inserted successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Sample data insertion had some issues (this is normal if user already exists)${NC}"
    fi
fi

# Verify installation
echo -e "${YELLOW}🔍 Verifying installation...${NC}"
VERIFICATION_RESULT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -p "$PGPORT" -t -c "
SELECT
    COUNT(*) as table_count,
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM research_sessions) as session_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'research_sessions', 'research_steps', 'research_sources', 'graph_nodes', 'graph_edges', 'function_calls');
" | tr -d ' ')

echo "Verification result: $VERIFICATION_RESULT"

# Parse verification result
IFS='|' read -ra RESULTS <<< "$VERIFICATION_RESULT"
TABLE_COUNT=${RESULTS[0]}
USER_COUNT=${RESULTS[1]}
SESSION_COUNT=${RESULTS[2]}

if [ "$TABLE_COUNT" -eq 7 ]; then
    echo -e "${GREEN}✅ All 7 tables created successfully${NC}"
    echo -e "${GREEN}✅ Users: $USER_COUNT${NC}"
    echo -e "${GREEN}✅ Sample sessions: $SESSION_COUNT${NC}"
    echo -e "${GREEN}🎉 Database initialization completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "1. Copy .env.example to .env.local and update with your actual credentials"
    echo "2. Start the application with: npm run dev"
    echo "3. The app will automatically connect to your PostgreSQL database"
else
    echo -e "${RED}❌ Expected 7 tables but found $TABLE_COUNT${NC}"
    echo -e "${RED}Database initialization may have failed${NC}"
    exit 1
fi
