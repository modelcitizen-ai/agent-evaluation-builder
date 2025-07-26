# Deployment Scripts

## 🚀 PRIMARY DEPLOYMENT SCRIPTS

### `deploy-fresh-testing.sh` ⭐ **PROVEN WORKING**
**Status:** ✅ Successfully deployed June 23, 2025 - No 502 errors  
**URL:** https://human-eval-testing-g7ecekd2gtdcbpet.eastus2-01.azurewebsites.net/

**Use this script for:**
- Testing environment deployments
- When you need a clean, reliable deployment
- Reference implementation for production deployments

**Configuration:**
- App Name: `human-eval-testing`
- Resource Group: `human-eval-testing-rg`
- Location: `eastus2`
- Runtime: `NODE:22-lts`

**Features:**
- ✅ Proven configuration (no 502 errors)
- ✅ Node.js 22 runtime support
- ✅ Comprehensive error handling
- ✅ Azure subscription verification
- ✅ Clean URL generation (`eastus2` region)

### `deploy-fresh.sh` 🔧 **MAIN DEPLOYMENT**
**Status:** ⚠️ Requires testing with current config  
**Purpose:** Primary deployment script for production environments

**Use this script for:**
- Production deployments (after testing)
- When you need custom configuration
- Main deployment pipeline

## 📋 DEPLOYMENT PROCESS

### Quick Deployment (Recommended)
```bash
# For testing environment (PROVEN WORKING)
./scripts/deploy-fresh-testing.sh

# For production (after testing)
./scripts/deploy-fresh.sh
```

### Manual Deployment Steps
```bash
# 1. Prerequisites check
az account show
node -v
ls -la .env.local

# 2. Clean build
rm -rf .next
npm ci --legacy-peer-deps
NODE_ENV=production npm run build

# 3. Run deployment script
./scripts/deploy-fresh-testing.sh
```

## 🔍 MONITORING & VERIFICATION

### Real-time Monitoring
```bash
# Monitor deployment logs
az webapp log tail --name human-eval-testing --resource-group human-eval-testing-rg

# Health check
curl -v https://human-eval-testing-g7ecekd2gtdcbpet.eastus2-01.azurewebsites.net/health
```

### Post-Deployment Verification
```bash
# Verify app settings
az webapp config appsettings list --name human-eval-testing --resource-group human-eval-testing-rg --output table

# Check application status
az webapp show --name human-eval-testing --resource-group human-eval-testing-rg --query "state"
```

## 🚨 TROUBLESHOOTING

### Emergency Diagnostics
```bash
# Check logs immediately after deployment
az webapp log tail --name human-eval-testing --resource-group human-eval-testing-rg

# Download logs for analysis
az webapp log download --name human-eval-testing --resource-group human-eval-testing-rg --log-file webapp-logs.zip
```

### Configuration Verification
```bash
# Verify critical app settings
az webapp config appsettings show --name human-eval-testing --resource-group human-eval-testing-rg --setting-names SCM_DO_BUILD_DURING_DEPLOYMENT ENABLE_ORYX_BUILD WEBSITE_RUN_FROM_PACKAGE WEBSITES_PORT PORT NODE_ENV
```

## 📚 CRITICAL DOCUMENTATION

### Required Reading
1. **[Azure Deployment Success Guide](../docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)** - Exact working configuration
2. **[Troubleshooting Silent Failures](../docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)** - Debug deployment issues
3. **[Root README](../README.md)** - Project overview and quick start

### Key Configuration Files
- `.env.local` - Local environment variables
- `server.js` - Custom Next.js server (CRITICAL)
- `next.config.mjs` - Next.js configuration
- `package.json` - Dependencies and scripts

## ⚠️ CRITICAL WARNINGS

### DO NOT MODIFY WITHOUT TESTING
The `deploy-fresh-testing.sh` script has been proven to work. Any modifications may cause silent deployment failures.

### ALWAYS MONITOR LOGS
After deployment, immediately start monitoring logs:
```bash
az webapp log tail --name human-eval-testing --resource-group human-eval-testing-rg
```

### VERIFY HEALTH ENDPOINT
Test the health endpoint immediately after deployment:
```bash
curl -v https://human-eval-testing-g7ecekd2gtdcbpet.eastus2-01.azurewebsites.net/health
```

## 🔧 LEGACY & ALTERNATIVE SCRIPTS

### `deploy-localstorage.sh` 🔄 **FALLBACK** 
Legacy production deployment script.
- Maintained as backup
- Still functional for production use
- Use only if primary scripts fail

### `deploy-manual.sh` 🛠️ **MANUAL/TROUBLESHOOTING**
Simple manual deployment for ad-hoc use and troubleshooting.
- Use for debugging deployment issues
- Manual step-by-step process
- Good for understanding deployment mechanics

## 🏆 SUCCESS METRICS

### Deployment Success Indicators
- ✅ Build completes in under 5 minutes
- ✅ ZIP package deploys successfully
- ✅ Health endpoint returns 200 status
- ✅ Application responds within 60 seconds
- ✅ No "Cannot find module" errors in logs
- ✅ No 502 Bad Gateway errors

### Performance Benchmarks
- **Total Deployment Time:** 12-20 minutes
- **Application Startup:** Under 60 seconds
- **Health Check Response:** Under 5 seconds

---

**Quick Reference:** Use `deploy-fresh-testing.sh` for reliable deployments. Monitor logs immediately. Test health endpoint. Follow the proven configuration exactly.