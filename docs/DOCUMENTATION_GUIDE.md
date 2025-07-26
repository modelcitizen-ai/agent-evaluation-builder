# Documentation Quick Reference Guide

## Where to Put New Documentation

### 🤔 Quick Decision Tree

**Is it about deployment or infrastructure?** → `/docs/deployment/`  
**Is it a new feature or enhancement?** → `/docs/features/`  
**Is it a bug fix or issue resolution?** → `/docs/fixes/`  
**Is it about progress tracking or dashboards?** → `/docs/progress-tracking/`  
**Is it about code refactoring or architecture?** → `/docs/refactoring/`  
**Is it about reviewer functionality?** → `/docs/reviewer-features/`  

### 📝 File Naming Examples

**Good naming:**
- `AZURE_DEPLOYMENT_TROUBLESHOOTING.md`
- `USER_AUTHENTICATION_FEATURE_COMPLETE.md`
- `MEMORY_LEAK_BUG_FIX.md`
- `PROGRESS_CALCULATION_REFACTOR.md`

**Avoid generic naming:**
- `UPDATE.md`
- `CHANGES.md`
- `FIX.md`
- `NEW_FEATURE.md`

### ✅ What to Include in Every Doc

1. **Header with date and purpose**
2. **Status** (In Progress, Complete, Planned)
3. **Related files or components affected**
4. **Prerequisites or dependencies**
5. **Testing or verification steps**

### 🚫 What NOT to Do

- **Don't** put markdown files in the root directory
- **Don't** use vague or generic filenames
- **Don't** forget to update the category README when adding files
- **Don't** duplicate information across multiple files

### 🔄 Maintenance Workflow

1. **Create** your markdown file in the appropriate `/docs/category/` directory
2. **Update** the category README.md to mention your new file
3. **Link** to related documentation when relevant
4. **Review** periodically for outdated information

---
*This guide ensures our documentation stays organized and discoverable as the project grows.*
