#!/bin/bash

# Azure PostgreSQL Database Setup Script
# This script initializes the Reveries database schema on Azure PostgreSQL

set -e

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ] || [ -z "$PGPASSWORD" ]; then
    echo "Error: Missing required environment variables."
    echo "Please ensure PGHOST, PGUSER, PGDATABASE, and PGPASSWORD are set in .env.local"
    exit 1
fi

echo "Connecting to Azure PostgreSQL..."
echo "Host: $PGHOST"
echo "User: $PGUSER"
echo "Database: $PGDATABASE"

# Test connection
echo "Testing database connection..."
if ! psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Error: Could not connect to database. Please check your credentials."
    exit 1
fi

echo "Database connection successful!"

# Initialize schema
echo "Initializing database schema..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f src/database/init/01-init.sql

# Insert sample data (optional)
read -p "Do you want to insert sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Inserting sample data..."
    psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f src/database/init/02-sample-data.sql
    echo "Sample data inserted successfully!"
fi

echo "Database setup completed successfully!"
echo ""
echo "You can now start the application with:"
echo "  npm run dev"
echo ""
echo "Or with Docker:"
echo "  docker-compose up app"
