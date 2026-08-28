#!/bin/bash
# Safe wrapper around dbmate for polaris-smart-access-service
# Only allows: new, status, migrate (destructive commands rejected)

set -e

ALLOWED_COMMANDS=("new" "status" "migrate")
COMMAND="${1:-}"

# Validate command
if [[ ! " ${ALLOWED_COMMANDS[@]} " =~ " ${COMMAND} " ]]; then
    echo "❌ Error: Command '$COMMAND' not allowed"
    echo "Allowed commands: ${ALLOWED_COMMANDS[*]}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/dbmate.sh new <migration_name>"
    echo "  ./scripts/dbmate.sh status"
    echo "  ./scripts/dbmate.sh migrate"
    exit 1
fi

# For status and migrate, require DATABASE_URL
if [[ "$COMMAND" == "status" ]] || [[ "$COMMAND" == "migrate" ]]; then
    if [[ -z "$DATABASE_URL" ]]; then
        echo "❌ Error: DATABASE_URL not set"
        echo ""
        echo "Example (DEV only, never commit):"
        echo "  export DATABASE_URL=mysql://username:password@localhost:3306/polaris_smart_access"
        echo ""
        echo "Then run:"
        echo "  ./scripts/dbmate.sh $COMMAND"
        exit 1
    fi
    
    echo "ℹ️  Using DATABASE_URL: ${DATABASE_URL%%@*}@***"
fi

# Execute dbmate
case $COMMAND in
    new)
        if [[ -z "$2" ]]; then
            echo "❌ Error: Migration name required"
            echo "Usage: ./scripts/dbmate.sh new <migration_name>"
            exit 1
        fi
        echo "Creating migration: $2"
        dbmate new "$2"
        echo "✅ Migration created in migrations/ folder"
        ;;
    status)
        echo "Checking migration status..."
        dbmate status
        ;;
    migrate)
        echo "Running pending migrations..."
        dbmate up
        echo "✅ Migrations completed"
        ;;
esac
