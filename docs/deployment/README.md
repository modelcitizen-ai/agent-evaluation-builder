# Deployment Documentation

## 🚀 Current Deployment Guides

### Primary Documentation
- **[Azure Deployment Success Guide](AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)** ⭐ - Proven working configuration
- **[Troubleshooting Silent Failures](TROUBLESHOOTING-SILENT-FAILURES.md)** ⚠️ - Debug deployment issues

### Quick Start
```bash
# Use the proven working deployment script
./scripts/deploy-fresh-testing.sh
```

## 📋 One-Click Azure Deployment

### Portal Deployment
The "Deploy to Azure" button uses a compiled JSON ARM template hosted in Azure Storage for maximum compatibility with Azure Portal's Custom Deployment feature.

**Template Sources:**
- **Bicep Source**: `docs/deployment/azuredeploy.bicep` (human-readable)
- **JSON Template**: `docs/deployment/azuredeploy.json` (compiled for portal)
- **Hosted Location**: Azure Storage with SAS URLs for secure access

### Template Compilation
If you modify the Bicep template, recompile to JSON:
```bash
az bicep build --file docs/deployment/azuredeploy.bicep --outfile docs/deployment/azuredeploy.json
```

### Common Portal Errors
- **"Error parsing template. Please ensure template is valid JSON"**: Portal requires JSON format, not Bicep
- **"Invalid symbol at character position X"**: Template compilation or encoding issue
- **"Template URL not accessible"**: SAS URL expired or blob not found

## 📋 Deployment Process

1. **Prerequisites**: Azure CLI logged in, Node.js 18+, valid `.env.local`
2. **Run Script**: `./scripts/deploy-fresh-testing.sh`
3. **Monitor**: Watch logs and test health endpoint
4. **Verify**: Confirm application is responding

## 📚 Additional Resources

- **[Scripts Documentation](../../scripts/README.md)** - All deployment scripts
- **[Main Project README](../../README.md)** - Project overview

---

**For reliable deployments, always use the proven working configuration documented in the guides above.**