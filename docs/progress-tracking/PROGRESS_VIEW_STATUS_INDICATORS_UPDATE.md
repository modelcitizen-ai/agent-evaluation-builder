# Progress View Status Indicators Update

## Summary
Updated the progress dashboard component to improve status indicators according to specifications:

## Changes Made

### 1. **Completion Rate** ✅
- **Status**: Already correctly displayed as percentage
- **Format**: Shows percentage badge + "X / Y tasks" description
- **Example**: "67%" badge with "4 / 6 tasks" subtitle

### 2. **Active Reviewers** ✅ 
- **Status**: Maintained current format which shows active count + total
- **Format**: Shows count of active reviewers + "X total" description
- **Example**: "2" badge with "3 total" subtitle
- **Logic**: Counts reviewers with status="active"

### 3. **Overdue** ✅
- **Status**: Updated to "n total" format as requested
- **Format**: Shows count of overdue reviewers + "X total" description  
- **Example**: "1" badge with "3 total" subtitle
- **Logic**: Counts reviewers with status="overdue"

### 4. **Avg Time on Task** ✅
- **Status**: Updated to calculate per task instance
- **Format**: Shows calculated average + "per task instance (min)" description
- **Example**: "3.4" badge with "per task instance (min)" subtitle
- **Logic**: 
  ```typescript
  // Weighted average based on completed tasks per reviewer
  const avgTimePerTask = reviewers.reduce((sum, reviewer) => {
    const avgTime = parseFloat(reviewer.avgTime) || 0
    return sum + avgTime * reviewer.completed
  }, 0) / Math.max(totalCompleted, 1)
  ```

## Technical Improvements

### **TypeScript Enhancements**
- Added proper `Reviewer` interface:
  ```typescript
  interface Reviewer {
    id: number
    name: string
    email: string
    evaluationId: string
    status: "active" | "completed" | "overdue"
    completed: number
    total: number
    avgTime: string
  }
  ```
- Fixed all TypeScript implicit `any` type errors
- Properly typed all filter and map operations
- Enhanced type safety throughout the component

### **Calculation Logic**
- **Completion Rate**: Percentage of completed tasks across all reviewers
- **Active Reviewers**: Count of reviewers currently working (status="active")
- **Overdue**: Count of reviewers past deadline (status="overdue") with total context
- **Avg Time on Task**: Weighted average time per completed task instance

## File Modified
- `/Users/ericlewallen/human-eval/components/progress-dashboard.tsx`

## Results
- All status indicators now display with proper formatting
- TypeScript errors resolved
- Calculations are more accurate and meaningful
- User experience improved with better context

## Status: ✅ COMPLETE
All requested progress view status indicator updates have been implemented and tested.
