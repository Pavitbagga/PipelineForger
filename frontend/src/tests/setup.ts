import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver for React Flow
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock DOMMatrixReadOnly for React Flow
global.DOMMatrixReadOnly = class DOMMatrixReadOnly {
  m22 = 1;
  constructor() {}
};

// Cleanup after each test
afterEach(() => {
  cleanup();
});
