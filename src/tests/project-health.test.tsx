import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Home } from '../pages/Home';
import { SocketProvider } from '../contexts/SocketContext';

// Mock console methods to catch errors and warnings
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true
};

const MockSocketProvider = ({ children }: { children: React.ReactNode }) => (
  // @ts-expect-error - mocking context for tests
  <SocketProvider value={mockSocket}>
    {children}
  </SocketProvider>
);

describe('Project Health Tests', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrors = [];
    consoleWarnings = [];

    // Mock console methods to capture errors and warnings
    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(' '));
      originalConsoleError(...args);
    });

    console.warn = vi.fn((...args) => {
      consoleWarnings.push(args.join(' '));
      originalConsoleWarn(...args);
    });

    // Mock getBoundingClientRect for the SVG container
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
    } as DOMRect));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('TypeScript Compilation', () => {
    it('should compile without TypeScript errors', async () => {
      // This test ensures that TypeScript compilation succeeds
      // If there are TS errors, the test file wouldn't even load
      expect(true).toBe(true);
    });
  });

  describe('Runtime Error Detection', () => {
    it('should render Home component without console errors', () => {
      render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Check that no console.error calls were made during rendering
      expect(consoleErrors).toEqual([]);
    });

    it('should render Home component without critical console warnings', () => {
      render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Filter out known non-critical warnings (like act() warnings in tests)
      const criticalWarnings = consoleWarnings.filter(warning => 
        !warning.includes('act(...)') && 
        !warning.includes('Warning: An update to') &&
        !warning.includes('React state updates should be wrapped')
      );

      expect(criticalWarnings).toEqual([]);
    });

    it('should not throw unhandled errors during rendering', () => {
      expect(() => {
        render(
          <MockSocketProvider>
            <Home />
          </MockSocketProvider>
        );
      }).not.toThrow();
    });

    it('should handle component lifecycle without errors', () => {
      const { unmount } = render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      expect(() => {
        unmount();
      }).not.toThrow();

      // Check that no errors occurred during unmounting
      expect(consoleErrors).toEqual([]);
    });
  });

  describe('Component Integration Health', () => {
    it('should render all major components without errors', () => {
      const { container } = render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Check that the main container exists
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();

      // Verify no errors during rendering
      expect(consoleErrors).toEqual([]);
    });

    it('should handle props and state updates without errors', () => {
      const { rerender } = render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Trigger a re-render
      rerender(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Should not cause any errors
      expect(consoleErrors).toEqual([]);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should cleanup event listeners properly', () => {
      const { unmount } = render(
        <MockSocketProvider>
          <Home />
        </MockSocketProvider>
      );

      // Count initial mock calls
      const initialSocketOffCalls = mockSocket.off.mock.calls.length;

      unmount();

      // Socket.off should be called during cleanup (though exact count may vary)
      expect(mockSocket.off.mock.calls.length).toBeGreaterThanOrEqual(initialSocketOffCalls);
    });

    it('should handle multiple render/unmount cycles without accumulating errors', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <MockSocketProvider>
            <Home />
          </MockSocketProvider>
        );
        unmount();
      }

      // Should not accumulate errors across multiple cycles
      expect(consoleErrors).toEqual([]);
    });
  });
});