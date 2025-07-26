#!/bin/bash

PROJECT_DIR="/Users/ericlewallen/human-eval-refactor"
BACKUP_BASE_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="deployment-refactor-complete-$TIMESTAMP"
BACKUP_FILE="$BACKUP_BASE_DIR/$BACKUP_NAME.tar.gz"
CURRENT_BACKUP="$BACKUP_BASE_DIR/DEPLOYMENT-REFACTOR-COMPLETE-CURRENT.tar.gz"
CURRENT_INFO="$BACKUP_BASE_DIR/DEPLOYMENT-REFACTOR-COMPLETE-CURRENT-INFO.md"

echo "🗄️  Creating project backup..."
echo "📁 Source: $PROJECT_DIR"
echo ""

# Create backup and archive directories
mkdir -p "$BACKUP_BASE_DIR/archive"

# Archive the previous CURRENT backup if it exists
if [ -f "$CURRENT_BACKUP" ]; then
    echo "📦 Archiving previous CURRENT backup..."
    PREV_TIMESTAMP=$(date -r "$CURRENT_BACKUP" +%Y%m%d-%H%M%S)
    mv "$CURRENT_BACKUP" "$BACKUP_BASE_DIR/archive/deployment-refactor-complete-$PREV_TIMESTAMP.tar.gz"
    if [ -f "$CURRENT_INFO" ]; then
        mv "$CURRENT_INFO" "$BACKUP_BASE_DIR/archive/deployment-refactor-complete-$PREV_TIMESTAMP-INFO.md"
    fi
    echo "✅ Previous CURRENT backup archived"
fi

# Archive any leftover timestamped backups in main folder
for old_backup in "$BACKUP_BASE_DIR"/deployment-refactor-complete-*.tar.gz; do
    if [ -f "$old_backup" ] && [[ "$old_backup" != "$CURRENT_BACKUP" ]]; then
        echo "📦 Archiving old backup: $(basename "$old_backup")"
        mv "$old_backup" "$BACKUP_BASE_DIR/archive/"
    fi
done

for old_info in "$BACKUP_BASE_DIR"/deployment-refactor-complete-*-INFO.md; do
    if [ -f "$old_info" ] && [[ "$old_info" != "$CURRENT_INFO" ]]; then
        echo "📦 Archiving old info: $(basename "$old_info")"
        mv "$old_info" "$BACKUP_BASE_DIR/archive/"
    fi
done

# Create the new backup
echo "🗄️ Creating new backup..."
cd "$(dirname "$PROJECT_DIR")"
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='backups' \
    "$(basename "$PROJECT_DIR")"

# Create backup info file
cat > "$BACKUP_BASE_DIR/$BACKUP_NAME-INFO.md" << EOL
# Backup Information - Deployment Refactoring Complete

- **Created**: $(date)
- **Status**: ✅ DEPLOYMENT REFACTORING COMPLETE

## What's Included
- ✅ Proven deployment script: scripts/deploy-fresh-testing.sh
- ✅ Comprehensive guides: docs/deployment/
- ✅ All source code and configuration

## Restore Instructions
1. tar -xzf DEPLOYMENT-REFACTOR-COMPLETE-CURRENT.tar.gz
2. cd human-eval-refactor
3. npm install --legacy-peer-deps
4. Configure .env.local
5. Ready to deploy!
EOL

# Make this backup the new CURRENT
cp "$BACKUP_FILE" "$CURRENT_BACKUP"
cp "$BACKUP_BASE_DIR/$BACKUP_NAME-INFO.md" "$CURRENT_INFO"

# Clean up: remove the timestamped version (we have CURRENT and archived versions)
rm "$BACKUP_FILE"
rm "$BACKUP_BASE_DIR/$BACKUP_NAME-INFO.md"

BACKUP_SIZE=$(du -sh "$CURRENT_BACKUP" | cut -f1)

echo ""
echo "✅ Backup completed successfully!"
echo "📊 Size: $BACKUP_SIZE"
echo "📦 Current Backup: DEPLOYMENT-REFACTOR-COMPLETE-CURRENT.tar.gz"
echo "📂 Previous backups: backups/archive/"
echo "🏆 MILESTONE BACKUP: Deployment Refactoring Complete!"
echo ""
echo "🔄 To restore, always use:"
echo "   tar -xzf backups/DEPLOYMENT-REFACTOR-COMPLETE-CURRENT.tar.gz"