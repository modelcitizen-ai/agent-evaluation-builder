# AI Coding Agent Instructions

## Project Overview
This is a **Human Evaluation Builder** - a Next.js 15/React 19 application for creating and managing human evaluations with Azure OpenAI integration. The application runs entirely on localStorage (no external database) and is optimized for Azure App Service deployment.

## Architecture & Data Flow
- **Storage**: localStorage-based with fallback to in-memory storage for Azure environments
- **Database Layer**: `lib/db/localStorage-adapter.ts` provides database-like operations via localStorage
- **State Management**: React contexts (`contexts/`) + localStorage persistence
- **AI Integration**: Azure OpenAI via `@ai-sdk/azure` (server-side only in `lib/azure-openai.ts`)
- **UI**: Tailwind CSS + Radix UI components + shadcn/ui patterns

## Critical Development Patterns

### 1. Database Operations
All database operations go through `lib/db/db-adapter.ts` which re-exports localStorage functions:
```typescript
// Always use the adapter, never direct localStorage access
import { getEvaluations, createEvaluation } from '@/lib/db/db-adapter'
```

### 2. Client/Server Hydration Handling
The app uses careful hydration patterns to avoid SSR mismatches:
- `DatabaseProvider` initializes with `dbReady: true` to prevent hydration errors
- Server-side rendering compatibility via `typeof window === 'undefined'` checks
- Memory fallback storage for Azure environments where localStorage might fail

### 3. Azure OpenAI Integration
- **Server-side only**: Azure OpenAI calls happen in API routes (`app/api/`)
- Environment variables: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`
- Test integration: `node scripts/test-azure-openai.js`

### 4. Component Structure
- **Layout**: `app/ClientLayout.tsx` wraps everything in providers (Database, GlobalLoading)
- **Pages**: App Router structure with conditional header display (`isHomePage` logic)
- **UI Components**: Located in `components/ui/` following shadcn/ui patterns
- **Feature Components**: Domain-specific components in `components/reviewer/`, `components/data-scientist/`

## Essential Commands

### Development
```bash
npm install --legacy-peer-deps  # Required for dependency resolution
npm run dev                     # Development server with Turbo
npm run test                    # Jest test suite
npm run test:watch             # Watch mode testing
```

### Deployment
```bash
./scripts/deploy-fresh-testing.sh  # Proven deployment script (Azure)
./scripts/verify-deployment.sh     # Post-deployment verification
./scripts/monitor-logs.sh          # Stream Azure App Service logs
```

### Testing & Debugging
```bash
node scripts/test-azure-openai.js                    # Test AI integration
npm run test -- --testPathPattern=evaluation        # Run specific tests
./scripts/check-deployment-readiness.sh             # Pre-deployment validation
```

## Key File Locations

### Configuration
- `server.js` - Custom production server with environment loading
- `jest.config.js` - Testing configuration with module path mapping
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind customization

### Core Logic
- `lib/db/localStorage-adapter.ts` - Database abstraction layer
- `lib/azure-openai.ts` - AI integration (server-side only)
- `components/database-provider.tsx` - Global database state management
- `app/api/*/route.ts` - API endpoints for data operations

### Documentation
- `docs/deployment/AZURE_DEPLOYMENT_SUCCESS_GUIDE.md` - Deployment guide
- `docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md` - Troubleshooting guide

## Testing Conventions
- Jest with jsdom environment for React components
- Path aliases: `@/`, `@lib/`, `@app/`, `@components/`
- Coverage collection from `lib/`, `app/`, `components/` directories
- Mock files in `__mocks__/` (e.g., `styleMock.js` for CSS)

## Deployment Notes
- **Production Server**: Custom `server.js` handles environment loading and port configuration
- **Azure Optimization**: Memory fallback for localStorage, comprehensive error handling
- **Node.js 22 Runtime**: Specified in deployment scripts
- **Environment Variables**: Auto-loaded from `.env.local` or `.env` files
- **Build Command**: `npm run build` (outputs to `.next/`)
- **Start Command**: `node server.js` (not `npm start`)

## Evaluation & Reviewer Workflow Patterns

### 1. Reviewer Independence & Status Tracking
- **Independent Progress**: Each reviewer has isolated progress tracking via `participant` URL parameters
- **Status Management**: Three completion detection methods work together:
  ```typescript
  const completedByStatus = reviewer.status === "completed"
  const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0
  const completedByCompletionsArray = reviewerCompletions.includes(evaluation.id)
  ```
- **Real-time Updates**: Custom events (`reviewerProgressUpdated`, `evaluationCompleted`) sync progress across components

### 2. Data Scientist Workflow
- **Evaluation Lifecycle**: Draft → Active → Completed status progression
- **Progress Monitoring**: Real-time completion detection with 3-second polling intervals
- **Force Refresh Logic**: `forceCheckAllEvaluationCompletions()` processes all evaluations regardless of status

### 3. Reviewer Task Execution
- **Response Persistence**: Participant-specific localStorage keys (`evaluation_${taskId}_reviewer_${participantId}_responses`)
- **Progress Synchronization**: Updates both reviewer progress and evaluation status in real-time
- **Time Analytics**: Tracks `questionStartTime` and calculates `avgTime` for completion metrics
- **Form State Management**: Handles navigation, validation, and modification detection

### 4. Multi-Reviewer Coordination
- **Reviewer Assignment**: Links reviewers to evaluations via `evaluationReviewers` array
- **Status Isolation**: Individual reviewer completion doesn't affect others' status
- **Progress Dashboard**: Filters reviewers by evaluation ID with type-safe comparison

## Common Patterns to Follow
1. **Always use the database adapter** instead of direct localStorage
2. **Handle server-side rendering** with `typeof window` checks
3. **Use API routes** for Azure OpenAI calls (never client-side)
4. **Follow shadcn/ui patterns** for new components
5. **Test deployment readiness** before deploying with provided scripts
6. **Use absolute imports** with configured path aliases
7. **Use participant URL parameters** for reviewer-specific data isolation
8. **Implement triple completion detection** for robust status tracking
9. **Dispatch custom events** for real-time progress synchronization

## Troubleshooting References
- Silent deployment failures → `docs/deployment/TROUBLESHOOTING-SILENT-FAILURES.md`
- Azure OpenAI errors → Check environment variables and test with `scripts/test-azure-openai.js`
- Build errors → Run `npm install --legacy-peer-deps`
- Hydration errors → Check client/server rendering patterns in existing components
