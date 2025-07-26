// Add any global test setup here
import '@testing-library/jest-dom';

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Performance.now polyfill for Node environment
if (typeof window === 'undefined') {
  global.performance = {
    now: () => new Date().getTime()
  };
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
