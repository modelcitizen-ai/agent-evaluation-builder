# Oversized Components Analysis

This document provides a detailed analysis of the three largest components in the codebase that require breaking down into smaller, more manageable pieces.

## Overview

Three main components exceed manageable file sizes and complexity:

1. **Preview Page** (`app/data-scientist/new/preview/page.tsx`) - 1,865 lines
2. **Reviewer Task Page** (`app/reviewer/task/[id]/page.tsx`) - 1,213 lines  
3. **Data Scientist Dashboard** (`app/data-scientist/page.tsx`) - 639 lines

---

## 1. Preview Page Analysis (1,865 lines)

**File:** `app/data-scientist/new/preview/page.tsx`

### Primary Responsibilities
This component serves as the comprehensive evaluation configuration interface for data scientists. It handles:

#### Data Management & Analysis
- Uploads and processes CSV/dataset files
- Performs AI-powered column analysis using Azure OpenAI
- Implements fallback analysis when AI is unavailable
- Manages column role assignment (Input, Model Output, Reference, Metadata, Excluded)
- Generates contextual evaluation names based on data content

#### Evaluation Configuration
- Creates and manages evaluation criteria/metrics
- Supports multiple metric types (yes-no, Likert scale, custom lists, text input)
- Handles metric editing, deletion, and reordering
- Provides undo functionality for metric deletions
- Manages evaluation instructions and naming

#### UI State Management  
- Two-column resizable layout with drag functionality
- Multi-step form navigation
- Modal dialogs for metric editing
- Collapsible sections for dataset configuration and instructions
- Real-time form validation and modification tracking

#### Data Persistence
- SessionStorage management for upload data and AI results
- LocalStorage for saved evaluations
- Integration with results dataset initialization
- Backup and restore functionality for editing existing evaluations

### Key State Variables (20+ useState hooks)
- `currentItem`, `formData`, `isSubmitting` - Form navigation and submission
- `editingMetric`, `isEditModalOpen` - Metric editing modal state
- `aiAnalysisResult`, `analysisError` - AI analysis results and errors
- `uploadedData`, `dataColumns` - Dataset content and structure
- `evaluationName`, `instructions`, `criteria` - Core evaluation configuration
- `columnRoles` - Column role assignments and confidence scores
- `leftColumnWidth`, `isDragging` - UI layout and resizing
- `allResponses`, `submittedItems`, `isReviewComplete` - Review progress tracking

### Major Functions & Logic Blocks
1. **AI Analysis Pipeline** - Azure OpenAI integration for intelligent column and metric suggestions
2. **Fallback Analysis Engine** - Rule-based column detection and confidence scoring
3. **Column Role Management** - Dynamic role assignment with confidence indicators
4. **Metric Management System** - CRUD operations for evaluation criteria
5. **Data Preview Interface** - Interactive dataset viewer with role assignments
6. **Evaluation Persistence** - Save/load functionality with validation

### Integration Points
- `@/lib/client-db` - Database operations
- `@/lib/results-dataset` - Results dataset management
- `@/components/edit-metric-modal` - Modal component for metric editing
- `@/components/content-renderer` - Content display component
- SessionStorage for temporary data persistence
- LocalStorage for permanent evaluation storage

---

## 2. Reviewer Task Page Analysis (1,213 lines)

**File:** `app/reviewer/task/[id]/page.tsx`

### Primary Responsibilities
This component provides the interface for reviewers to complete evaluation tasks assigned by data scientists.

#### Task Execution Interface
- Displays individual data items for evaluation
- Renders dynamic form fields based on evaluation criteria
- Manages form navigation between items (previous/next)
- Handles form submission and validation
- Tracks completion progress and status

#### Response Management
- Saves responses to localStorage with participant-specific keys
- Maintains response state across browser sessions
- Tracks submitted vs. drafted responses
- Supports form modification detection and warnings

#### Progress Tracking
- Records time spent per question for analytics
- Updates reviewer average completion time
- Tracks furthest item reached for resume functionality
- Synchronizes progress with evaluation reviewer records

#### Multi-Reviewer Support
- Handles participant ID-based response isolation
- Manages reviewer-specific progress and completion status
- Updates evaluation completion status when all reviewers finish

### Key State Variables (15+ useState hooks)
- `currentItem`, `formData` - Current evaluation item and responses
- `evaluation` - Full evaluation configuration and data
- `allResponses`, `submittedItems` - Response tracking across all items
- `furthestItemReached`, `isReviewComplete` - Progress tracking
- `questionStartTime` - Time tracking for analytics
- `leftColumnWidth`, `isDragging` - UI layout management
- `showInstructions` - UI state for instruction display

### Major Functions & Logic Blocks
1. **Response Persistence System** - LocalStorage management with participant-specific keys
2. **Progress Synchronization** - Updates evaluation and reviewer status in real-time
3. **Time Tracking Analytics** - Records and calculates average completion times
4. **Form Navigation Logic** - Previous/next item navigation with validation
5. **Completion Detection** - Determines when review is complete and updates status
6. **Multi-Reviewer Coordination** - Manages concurrent reviewer progress

### Integration Points
- `@/lib/results-dataset` - Results data storage and management
- URL parameters for task ID and participant identification
- LocalStorage for evaluation data, responses, and progress
- Real-time updates to evaluation completion status

---

## 3. Data Scientist Dashboard Analysis (639 lines)

**File:** `app/data-scientist/page.tsx`

### Primary Responsibilities
This component serves as the main dashboard for data scientists to manage their evaluations.

#### Evaluation Management
- Displays list of all created evaluations with status and metrics
- Provides CRUD operations (Create, Read, Update, Delete)
- Handles evaluation status updates (draft, active, completed)
- Manages evaluation lifecycle from creation to completion

#### Progress Monitoring
- Real-time completion status checking with periodic updates
- Comprehensive evaluation completion detection
- Progress visualization and metrics display
- Reviewer assignment and status tracking

#### Navigation & Actions
- Edit evaluation configuration
- View detailed progress reports
- Assign reviewers to evaluations
- Delete evaluations with confirmation
- Create new evaluations

### Key State Variables (5+ useState hooks)
- `evaluations` - List of all evaluations with status and metadata
- `openDropdown` - UI state for action menus
- `isLoading`, `error` - Loading and error states

### Major Functions & Logic Blocks
1. **Evaluation Loading System** - Fetches and displays evaluation list
2. **Status Update Engine** - Periodic checking and updating of completion status
3. **Completion Detection Logic** - Comprehensive checking of reviewer completion
4. **Reviewer Management** - Assignment and status tracking integration
5. **Action Handler System** - Edit, delete, assign, and view operations

### Integration Points
- `@/lib/client-db` - Database operations for evaluations
- LocalStorage for evaluation and reviewer data
- Real-time status updates with 3-second intervals
- Navigation to edit, progress, and reviewer assignment pages

---

## Common Patterns & Issues

### Shared Complexity
1. **LocalStorage Management** - All three components heavily rely on localStorage with complex key patterns
2. **State Synchronization** - Real-time updates between components require careful state management  
3. **Progress Tracking** - Complex logic for tracking completion across multiple reviewers
4. **UI State Management** - Extensive useState hooks for managing component state

### Performance Concerns
1. **Large Component Size** - Components are too large for effective debugging and maintenance
2. **Excessive Re-renders** - Many useState hooks can cause unnecessary re-renders
3. **Memory Usage** - Large state objects and frequent localStorage operations
4. **Bundle Size** - Large components increase initial load time

### Maintainability Issues
1. **Single Responsibility Violations** - Each component handles multiple concerns
2. **Tight Coupling** - Direct localStorage dependencies make testing difficult
3. **Code Duplication** - Similar patterns repeated across components
4. **Complex Dependencies** - Many interdependent state variables

---

## Refactoring Strategy

### Phase 1: Extract Business Logic
1. Create dedicated services for data management, progress tracking, and evaluation operations
2. Extract localStorage operations into centralized storage utilities
3. Create custom hooks for shared state management patterns

### Phase 2: Component Breakdown
1. **Preview Page**: Split into upload, analysis, configuration, and preview components
2. **Reviewer Task Page**: Separate form rendering, navigation, and progress tracking
3. **Data Scientist Dashboard**: Extract evaluation list, status monitoring, and action handlers

### Phase 3: State Management Optimization
1. Implement context providers for shared state
2. Create optimized selectors to prevent unnecessary re-renders
3. Add proper memoization for expensive operations

### Expected Benefits
- Improved code maintainability and readability
- Better testing capabilities through smaller, focused components
- Enhanced performance through optimized re-rendering
- Easier debugging and feature development
- Reduced bundle size and improved loading times

---

## Next Steps

1. Begin with extracting shared utilities and business logic
2. Create service layer abstractions for data operations
3. Break down components starting with the largest (Preview Page)
4. Implement proper state management patterns
5. Add comprehensive testing for extracted components
6. Optimize performance and bundle size
