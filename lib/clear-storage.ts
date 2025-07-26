// Simple utility to clear localStorage
// To use: Run this in the browser console or as a script

export function clearLocalStorage() {
  try {
    console.log('Clearing localStorage...');
    
    // Get current count of items for reporting
    const itemCount = localStorage.length;
    
    // Clear all localStorage
    localStorage.clear();
    
    console.log(`Success! Cleared ${itemCount} items from localStorage.`);
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

// If running directly in browser, execute immediately
if (typeof window !== 'undefined') {
  try {
    const itemCount = localStorage.length;
    localStorage.clear();
    console.log(`%c✅ Successfully cleared ${itemCount} items from localStorage`, 'color: green; font-weight: bold');
    console.log('Refresh the page to see the empty state.');
  } catch (error) {
    console.error('%c❌ Error clearing localStorage:', 'color: red; font-weight: bold', error);
  }
}
