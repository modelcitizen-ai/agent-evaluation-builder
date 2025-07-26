# RECENT PROJECTS DROPDOWN - ADD REVIEWERS UPDATE ✅

## Summary
Updated the dropdown menu option in the "Recent Projects" section from "Add Participants" to "Add Reviewers" to maintain consistency with the updated terminology throughout the application.

## Files Modified

### 1. Main Application
**File:** `/app/data-scientist/page.tsx`  
**Line:** ~606  
**Change:** "Add Participants" → "Add Reviewers"

### 2. Deployment Version  
**File:** `/deployment-azure-native/app/data-scientist/page.tsx`  
**Line:** ~307  
**Change:** "Add Participants" → "Add Reviewers"

## Specific Changes Made

### Before:
```tsx
<button
  onClick={() => {
    handleAssignReviewers(evaluation.id)
    setOpenDropdown(null)
  }}
  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
>
  Add Participants
</button>
```

### After:
```tsx
<button
  onClick={() => {
    handleAssignReviewers(evaluation.id)
    setOpenDropdown(null)
  }}
  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
>
  Add Reviewers
</button>
```

## Context
This change is part of the broader effort to update terminology from "Participants" to "Reviewers" throughout the application. The dropdown menu in the Recent Projects section now correctly reflects this updated terminology.

## Location
The dropdown menu appears when users click the "..." (three dots) button next to each evaluation in the "Recent Projects" list on the Data Scientist dashboard page.

## Dropdown Menu Options (After Update)
1. Edit
2. Preview  
3. View Progress
4. **Add Reviewers** ← Updated
5. Delete

## Testing
✅ No TypeScript errors  
✅ Both main and deployment versions updated  
✅ Functionality preserved - still navigates to assign-reviewers page  
✅ Consistent terminology across the application  

## Result
The Recent Projects dropdown now uses "Add Reviewers" which is consistent with:
- The assign-reviewers page title: "Add Reviewers"
- The form heading: "Add Reviewer to Evaluation"  
- All other terminology throughout the application

---

**Date**: June 13, 2025  
**Task**: Update Recent Projects dropdown from "Add Participants" to "Add Reviewers"  
**Status**: COMPLETE ✅
