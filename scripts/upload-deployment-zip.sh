#!/usr/bin/env bash
# Upload deployment zip to Azure blob storage for Deploy to Azure button

set -euo pipefail

# Configuration
STORAGE_ACCOUNT="humanelevaldeploy"
CONTAINER_NAME="deploy"
BLOB_NAME="deployment-backend-built.zip"
LOCAL_FILE="./deployment-backend-built.zip"

echo "🚀 Uploading deployment zip to Azure blob storage..."

# Check if local file exists
if [ ! -f "$LOCAL_FILE" ]; then
    echo "❌ Local file not found: $LOCAL_FILE"
    echo "Run ./scripts/package-backend-zip.sh first to create the deployment package"
    exit 1
fi

# Check if Azure CLI is installed and logged in
if ! command -v az >/dev/null 2>&1; then
    echo "❌ Azure CLI not found. Please install it first."
    exit 1
fi

# Check if logged in
if ! az account show >/dev/null 2>&1; then
    echo "❌ Not logged into Azure. Run 'az login' first."
    exit 1
fi

echo "📦 Local file: $LOCAL_FILE ($(ls -lh "$LOCAL_FILE" | awk '{print $5}'))"
echo "🎯 Target: $STORAGE_ACCOUNT/$CONTAINER_NAME/$BLOB_NAME"

# Upload to blob storage
echo "⬆️  Uploading..."
az storage blob upload \
    --account-name "$STORAGE_ACCOUNT" \
    --container-name "$CONTAINER_NAME" \
    --name "$BLOB_NAME" \
    --file "$LOCAL_FILE" \
    --overwrite

echo "✅ Upload completed successfully!"
echo ""
echo "🔗 The Deploy to Azure button will now use the updated code."
echo "   Blob URL: https://$STORAGE_ACCOUNT.blob.core.windows.net/$CONTAINER_NAME/$BLOB_NAME"
