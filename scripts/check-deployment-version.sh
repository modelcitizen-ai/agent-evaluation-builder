#!/bin/bash
# Check if the deployment has the latest debugging code

DEPLOYMENT_URL=${1:-"https://humanevalapp0809m.azurewebsites.net"}

echo "🔍 Checking deployment version at: $DEPLOYMENT_URL"
echo ""

# Test if the API returns enhanced debugging
echo "Testing API with debugging..."
curl -X POST -H "Content-Type: application/json" -d '{
  "name": "Debug Test",
  "status": "draft",
  "totalItems": 0,
  "criteria": []
}' "$DEPLOYMENT_URL/api/evaluations" 2>/dev/null

echo ""
echo ""
echo "If you see enhanced logging like '🚀 [API]' or '🔍 [API]' in Azure logs, the deployment has the latest code."
echo "If not, you need to redeploy with the latest feat/one-click-deploy branch."
