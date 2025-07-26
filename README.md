# Human Evaluation Builder

A Next.js application for creating and managing human evaluations with Azure OpenAI integration.

## Quick Start

### Prerequisites
- Node.js 22+ (recommended)
- Azure CLI
- Azure OpenAI account

### Local Development
```bash
npm install --legacy-peer-deps
cp .env.local.example .env.local  # Configure your Azure OpenAI credentials
npm run dev
```

## 🚀 Deployment

### **Recommended: Proven Deployment Process**
Use the validated deployment script with comprehensive documentation:

```bash
./scripts/deploy-fresh-testing.sh
```

📖 **Essential Guides:**
- **[Azure Deployment Success Guide](docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)** - Step-by-step proven process ⭐
- **[Troubleshooting Silent Failures](docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)** - Diagnostic and recovery playbook 🛠️

**Features:**
- ✅ Node.js 22 runtime
- ✅ Next.js 15 / React 19 support  
- ✅ Comprehensive error handling
- ✅ 502 error prevention
- ✅ Production-ready configuration

### Alternative Deployment
- **Production (requires validation):** `./scripts/deploy-fresh.sh`
- **Legacy:** `./scripts/deploy-localstorage.sh`

### Environment Setup
1. Copy `.env.local.example` to `.env.local`
2. Configure Azure OpenAI credentials:
   ```env
   AZURE_OPENAI_API_KEY=your_key_here
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   AZURE_OPENAI_DEPLOYMENT=your_deployment_name
   ```

## 📚 Documentation

- **[🎯 Deployment Success Guide](docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)** - Your go-to deployment resource
- **[🛠️ Troubleshooting Guide](docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)** - Fix silent failures and 502 errors
- **[Deployment Overview](docs/deployment/README.md)** - All deployment documentation
- **[Scripts Reference](scripts/README.md)** - All available scripts
- **[Features](docs/features/README.md)** - Feature documentation
- **[Fixes](docs/fixes/README.md)** - Bug fix history

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting

### Testing Azure OpenAI Integration
```bash
node scripts/test-azure-openai.js
```

## 🏗️ Architecture

- **Frontend:** Next.js 15 with React 19
- **Styling:** Tailwind CSS
- **AI Integration:** Azure OpenAI with @ai-sdk/azure
- **Deployment:** Azure App Service (Node.js 22)
- **Storage:** localStorage (no database required)

## 📋 Project Status

This project has been modernized and refactored for:
- Next.js 15 / React 19 compatibility
- Bulletproof Azure deployment process
- Comprehensive error handling and logging
- Silent failure prevention and recovery
- Consolidated documentation

## 🆘 Troubleshooting

### Quick Fixes
1. **Deployment fails:** Use the [Deployment Success Guide](docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md)
2. **502 errors or silent failures:** Follow the [Troubleshooting Guide](docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)
3. **OpenAI errors:** Verify credentials in `.env.local`
4. **Build errors:** Run `npm install --legacy-peer-deps`

### Getting Help
- Check logs: `./scripts/monitor-logs.sh`
- Verify deployment: `./scripts/verify-deployment.sh`
- Full troubleshooting: [Silent Failures Guide](docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)

## 🔧 Utility Scripts

### Deployment & Verification
- `./scripts/deploy-fresh-testing.sh` - **Proven deployment script** ⭐
- `./scripts/deploy-fresh.sh` - Production deployment script
- `./scripts/verify-deployment.sh` - Verify deployed application
- `./scripts/monitor-logs.sh` - Stream Azure App Service logs

### Development & Testing
- `./scripts/test-azure-openai.js` - Test OpenAI integration
- `./scripts/check-deployment-readiness.sh` - Pre-deployment checks

---

**Quick Deploy:** `./scripts/deploy-fresh-testing.sh` | **Success Guide:** [AZURE_DEPLOYMENT_SUCCESS_GUIDE.md](docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md) | **Troubleshooting:** [TROUBLESHOOTING-SILENT-FAILURES.md](docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md)