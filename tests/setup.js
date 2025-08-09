// Jest setup file
import 'jest-environment-jsdom';

// Mock DOM globals
global.performance = {
  now: jest.fn(() => Date.now())
};

global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

// Setup before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (global.document) {
    document.body.innerHTML = '';
  }
  if (global.localStorage) {
    localStorage.clear();
  }
});