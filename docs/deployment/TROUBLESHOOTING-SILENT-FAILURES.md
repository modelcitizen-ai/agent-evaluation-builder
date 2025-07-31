# Troubleshooting Silent Azure Deployment Failures

> **For working configuration:** See [Azure Deployment Success Guide](AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)  
> **For PostgreSQL deployment:** See [PostgreSQL Deployment Success](POSTGRESQL_DEPLOYMENT_SUCCESS.md)

## ✅ RECENT SUCCESS: PostgreSQL Deployment Fixed (July 31, 2025)

**Issue**: "Cannot find module 'next'" error in PostgreSQL backend deployment  
**Solution**: Use complete original package.json instead of minimal production version  
**Result**: ✅ Production deployment successful with full PostgreSQL functionality  
**Details**: See [PostgreSQL Fix Technical Summary](POSTGRESQL_FIX_TECHNICAL_SUMMARY.md)

## 🔍 SILENT FAILURE PATTERNS

Silent failures are the most dangerous because they appear to deploy successfully but crash immediately or become unresponsive without clear error messages.

### Pattern 1: "Deployment Succeeded" but 502 Error
**What happens:** Azure reports successful deployment, but app returns 502 Bad Gateway
**Root cause:** Missing dependencies, incorrect port binding, or Next.js configuration issues

### Pattern 2: App Loads Then Dies
**What happens:** Application loads briefly, then becomes unresponsive
**Root cause:** Runtime errors after initial startup, memory issues, or environment variable problems

### Pattern 3: Infinite Loading
**What happens:** App shows loading state indefinitely
**Root cause:** Server-side rendering issues, missing build artifacts, or API configuration problems

## 🚨 IMMEDIATE DIAGNOSTIC PROTOCOL

### Step 1: Real-Time Log Monitoring (CRITICAL)
```bash
# Start monitoring IMMEDIATELY after deployment
az webapp log tail --name human-eval-testing --resource-group human-eval-testing-rg

# Keep this running in separate terminal
# Look for:
# - "Server ready on http://0.0.0.0:8080" (SUCCESS)
# - "Cannot find module" (DEPENDENCY ISSUE)
# - "Error: listen EADDRINUSE" (PORT ISSUE)
# - "Failed to prepare Next.js app" (BUILD ISSUE)
```

### Step 2: Health Endpoint Test
```bash
# Test health endpoint immediately
curl -v https://human-eval-testing-g7ecekd2gtdcbpet.eastus2-01.azurewebsites.net/health

# Expected: HTTP 200 with JSON response
# Failure: HTTP 502, timeout, or connection refused
```

### Step 3: Kudu File System Check
```bash
# Access Kudu console
# URL: https://human-eval-testing.scm.azurewebsites.net
# Navigate to: site/wwwroot

# Verify critical files exist:
# ✅ .next/ directory with build files
# ✅ server.js file
# ✅ package.json with correct dependencies
# ✅ node_modules/ with installed packages
```

## 🔧 SPECIFIC FAILURE SCENARIOS & FIXES

### Scenario A: Missing Dependencies
**Symptoms:**
```
Error: Cannot find module '@ai-sdk/azure'
Error: Cannot find module 'ai'
Error: Cannot find module 'zod'
```

**Diagnostic:**
```bash
# Check production package.json in Kudu
cat site/wwwroot/package.json

# Test dependency loading
node -e "console.log(require('@ai-sdk/azure'))"
```

**Fix:**
```bash
# Verify production package.json contains ALL required dependencies
# Recreate deployment with correct dependencies
./scripts/deploy-fresh-testing.sh
```

### Scenario B: Port Configuration Issues
**Symptoms:**
```
Error: listen EADDRINUSE :::8080
Error: listen EADDRINUSE :::3000
```

**Diagnostic:**
```bash
# Check app settings
az webapp config appsettings list --name human-eval-testing --resource-group human-eval-testing-rg --output table | grep PORT
```

**Fix:**
```bash
# Set correct port configuration
az webapp config appsettings set \
  --name human-eval-testing \
  --resource-group human-eval-testing-rg \
  --settings \
    WEBSITES_PORT="8080" \
    PORT="8080"

az webapp restart --name human-eval-testing --resource-group human-eval-testing-rg
```

### Scenario C: Next.js Build Issues
**Symptoms:**
```
Error: Could not find a production build in the '.next' directory
Error: Failed to prepare Next.js app
```

**Diagnostic:**
```bash
# Check if .next directory exists and has content
# In Kudu: site/wwwroot/.next/
# Should contain: build-manifest.json, static/, server/

# Verify local build
ls -la .next/
```

**Fix:**
```bash
# Clean rebuild
rm -rf .next
NODE_ENV=production npm run build

# Verify build success
ls -la .next/static/
ls -la .next/server/

# Redeploy
./scripts/deploy-fresh-testing.sh
```

## 📞 EMERGENCY RESPONSE PLAN

### If Silent Failure Detected:

1. **IMMEDIATE ACTIONS (0-5 minutes)**
   ```bash
   # Capture logs
   az webapp log tail --name human-eval-testing --resource-group human-eval-testing-rg > emergency-logs.txt
   
   # Test health endpoint
   curl -v https://human-eval-testing-g7ecekd2gtdcbpet.eastus2-01.azurewebsites.net/health
   ```

2. **DIAGNOSTIC PHASE (5-15 minutes)**
   ```bash
   # Check Kudu file system
   # Visit: https://human-eval-testing.scm.azurewebsites.net
   
   # Verify app settings
   az webapp config appsettings list --name human-eval-testing --resource-group human-eval-testing-rg --output table
   
   # Test dependencies in Kudu console
   node -e "console.log(require('next').version)"
   ```

3. **RECOVERY PHASE (15-30 minutes)**
   ```bash
   # Try quick fixes first
   az webapp restart --name human-eval-testing --resource-group human-eval-testing-rg
   
   # If that fails, redeploy with proven config
   ./scripts/deploy-fresh-testing.sh
   ```

---

> **For proven working deployment steps:** See [Azure Deployment Success Guide](AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)

**Remember: Silent failures require immediate attention. Don't wait - diagnose and fix quickly to prevent extended downtime.**