# Human Evaluation Builder Documentation

This directory contains all project documentation organized by category.

## Directory Structure

### 📁 `/deployment/`
Documentation related to deployment processes, environments, and infrastructure:
- Azure deployment procedures and troubleshooting
- Environment-specific deployment guides
- Build and deployment automation
- Infrastructure analysis and recommendations

### 📁 `/features/`
Documentation for major feature implementations:
- Continue button functionality
- Time tracking and measurement
- OpenAI integration
- UI improvements and enhancements
- Recent projects functionality

### 📁 `/fixes/`
Documentation for bug fixes and issue resolutions:
- Completion detection fixes
- Database initialization fixes
- Progress bar and submission fixes
- Critical bug resolution reports

### 📁 `/progress-tracking/`
Documentation specific to progress tracking and dashboard functionality:
- Progress dashboard implementations
- Real-time progress updates
- Progress calculation and display
- Metrics and totals tracking
- Status indicators and UI updates

### 📁 `/refactoring/`
Documentation related to code refactoring and architectural improvements:
- Refactoring strategies and plans
- Phase-based improvement plans
- Code cleanup and organization
- Architecture decisions and migrations

### 📁 `/reviewer-features/`
Documentation for reviewer-specific functionality:
- Reviewer workflow improvements
- Reviewer association and management
- Reviewer status tracking
- Reviewer dashboard personalization
- Independent reviewer functionality

## Navigation Tips

### By Development Phase
- **Current Refactoring**: See `/refactoring/` for ongoing architectural improvements
- **Recent Fixes**: Check `/fixes/` for latest bug resolutions
- **Feature Development**: Browse `/features/` for implemented functionality

### By User Role
- **Developers**: Focus on `/refactoring/` and `/fixes/`
- **DevOps**: Check `/deployment/` for infrastructure and deployment info
- **Product**: Review `/features/` for user-facing functionality
- **QA**: Check `/fixes/` and `/progress-tracking/` for testing scenarios

### By Date
Documentation is organized by functional area rather than chronological order. Most files contain creation dates in their content for historical reference.

## File Naming Convention

Files generally follow the pattern:
- `FEATURE_NAME_STATUS.md` - Feature implementations
- `AREA_SPECIFIC_FIX_COMPLETE.md` - Bug fixes
- `COMPONENT_IMPROVEMENT_UPDATE.md` - Incremental improvements

## Maintenance

This documentation structure was created during Phase 1 refactoring (June 2025) to organize 53 scattered markdown files into logical categories. 

### Adding New Documentation

**All new markdown files should be placed in the appropriate category directory:**

#### Choose the Right Directory:
- **`/deployment/`** - Deployment procedures, infrastructure, builds, environment configs
- **`/features/`** - New feature implementations, UI improvements, integrations
- **`/fixes/`** - Bug fixes, issue resolutions, critical patches
- **`/progress-tracking/`** - Progress dashboard, metrics, real-time updates, tracking features
- **`/refactoring/`** - Architecture changes, code improvements, technical debt resolution
- **`/reviewer-features/`** - Reviewer workflow, reviewer management, reviewer-specific functionality

#### File Naming Guidelines:
- Use descriptive, specific names: `FEATURE_NAME_IMPLEMENTATION.md`
- Include status when relevant: `COMPONENT_REFACTOR_COMPLETE.md`
- Use consistent patterns: `AREA_SPECIFIC_ISSUE_FIX.md`
- Avoid generic names like `UPDATE.md` or `CHANGES.md`

#### Content Requirements:
- Include creation date and author
- Clearly state the purpose and scope
- Document any related files or dependencies
- Include status (In Progress, Complete, Planned)
- Add links to related documentation when relevant

### Directory-Specific Guidelines:

**`/deployment/`** - Include environment details, prerequisites, rollback procedures  
**`/features/`** - Include user stories, acceptance criteria, testing notes  
**`/fixes/`** - Include problem description, root cause, solution, testing  
**`/progress-tracking/`** - Include metrics affected, UI changes, calculation logic  
**`/refactoring/`** - Include before/after states, risk assessment, rollback plan  
**`/reviewer-features/`** - Include workflow impacts, user experience changes  

### Updating Category READMEs:
When adding new files, update the relevant category README.md to include:
1. Brief description of the new file
2. How it relates to existing documentation
3. Any important context or prerequisites

**❌ DO NOT** add markdown files to the root directory - they will be moved during routine cleanup
