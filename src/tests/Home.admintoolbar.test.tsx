/**
 * Tests for Admin Toolbar functionality
 * Validates tool selection, keyboard shortcuts, and admin mode toggling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Home } from '../pages/Home';
import { SocketProvider } from '../contexts/SocketContext';

// Mock SocketService to prevent real connections during tests
vi.mock("../services/SocketService", () => ({
  SocketService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnValue({
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }),
    disconnect: vi.fn(),
    isConnected: false,
    sendRequest: vi.fn().mockResolvedValue({ success: true }),
    authenticate: vi.fn(),
  })),
}));

// Mock socket context for admin toolbar testing - use simple SocketProvider without socket mocking
const MockSocketProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  )
}

// Mock the auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isAuthenticating: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const renderHome = () => {
  // Mock getBoundingClientRect
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
  } as DOMRect))

  return render(
    <MockSocketProvider>
      <Home />
    </MockSocketProvider>
  )
}

describe('Admin Toolbar Functionality', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.clearAllTimers();
    // Clean up any event listeners
    document.body.innerHTML = '';
  });

  describe('Basic Admin Mode Structure', () => {
    it('should not show admin toolbar by default', () => {
      renderHome();
      
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
      expect(screen.queryByText('Työkalut:')).not.toBeInTheDocument();
    });

    it('should toggle admin mode with A key', () => {
      renderHome();
      
      // Admin mode should not be visible initially
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
      
      // Press A key to toggle admin mode on
      fireEvent.keyDown(window, { key: 'a' });
      
      // Admin toolbar should now be visible
      expect(screen.getByText('ADMIN MODE')).toBeInTheDocument();
      expect(screen.getByText('Työkalut:')).toBeInTheDocument();
      
      // Press A key again to toggle admin mode off
      fireEvent.keyDown(window, { key: 'a' });
      
      // Admin toolbar should be hidden again
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
    });

    it('should exit admin mode with Escape key', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      expect(screen.getByText('ADMIN MODE')).toBeInTheDocument();
      
      // Press Escape to exit admin mode
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Admin toolbar should be hidden
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    it('should display all tool buttons when admin mode is active', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Check that all expected tools are present
      expect(screen.getByText('LED Strip')).toBeInTheDocument();
      expect(screen.getByText('Lämmitys')).toBeInTheDocument();
      expect(screen.getByText('Lamppu')).toBeInTheDocument();
      expect(screen.getByText('Seinävalo')).toBeInTheDocument();
      expect(screen.getByText('Peili')).toBeInTheDocument();
      expect(screen.getByText('Spotti')).toBeInTheDocument();
      expect(screen.getByText('Lämpötila')).toBeInTheDocument();
      expect(screen.getByText('Lämpöpumppu')).toBeInTheDocument();
      expect(screen.getByText('Kompressori')).toBeInTheDocument();
      expect(screen.getByText('Puhallin')).toBeInTheDocument();
      expect(screen.getByText('LP Kompressori')).toBeInTheDocument();
      expect(screen.getByText('VILP Sisäyksikkö')).toBeInTheDocument();
    });

    it('should allow tool selection by clicking buttons', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Click on LED Strip tool
      const ledStripButton = screen.getByText('LED Strip');
      fireEvent.click(ledStripButton);
      
      // The button should now be selected (bold font weight)
      expect(ledStripButton).toHaveStyle({ fontWeight: 'bold' });
    });
  });

  describe('Admin Controls', () => {
    it('should display control buttons in admin mode', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Check for control buttons
      expect(screen.getByText('Undo (Z)')).toBeInTheDocument();
      expect(screen.getByText('Redo (Y)')).toBeInTheDocument();
      expect(screen.getByText('Delete (Del)')).toBeInTheDocument();
      expect(screen.getByText('Save (S)')).toBeInTheDocument();
      expect(screen.getByText('Load (L)')).toBeInTheDocument();
    });

    it('should display snap 90 degrees checkbox', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Check for snap checkbox
      expect(screen.getByText('90° snap')).toBeInTheDocument();
      const snapCheckbox = screen.getByRole('checkbox');
      expect(snapCheckbox).toBeInTheDocument();
      expect(snapCheckbox).not.toBeChecked();
    });

    it('should display help text', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Check for help text
      expect(screen.getByText('ESC: Exit admin')).toBeInTheDocument();
      expect(screen.getByText('Click: Add point/lamp')).toBeInTheDocument();
      expect(screen.getByText('Right-click: Remove point')).toBeInTheDocument();
      expect(screen.getByText('Enter: Finish strip')).toBeInTheDocument();
      expect(screen.getByText('Drag: Move items')).toBeInTheDocument();
    });
  });

  describe('Drawing Tools', () => {
    it('should show drawing tools when strip tool is selected', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Select strip tool
      fireEvent.click(screen.getByText('LED Strip'));
      
      // Check for drawing-specific buttons
      expect(screen.getByText('+ Strip')).toBeInTheDocument();
      expect(screen.getByText('Shorten')).toBeInTheDocument();
    });

    it('should show drawing tools when heating tool is selected', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Select heating tool
      fireEvent.click(screen.getByText('Lämmitys'));
      
      // Check for drawing-specific buttons
      expect(screen.getByText('+ Lämmitys')).toBeInTheDocument();
      expect(screen.getByText('Shorten')).toBeInTheDocument();
    });

    it('should show instruction text for non-drawing tools', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Default tool should be 'lamp'
      expect(screen.getByText(/Klikkaa kohtaa kuvassa lisätäksesi lamppua/)).toBeInTheDocument();
      expect(screen.getByText(/Klikkaa lamppua asettaaksesi rele ID/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should not respond to A key with modifier keys', () => {
      renderHome();
      
      // Try with Ctrl+A (should not toggle admin mode)
      fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
      
      // Try with Meta+A (should not toggle admin mode)
      fireEvent.keyDown(window, { key: 'a', metaKey: true });
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
      
      // Try with Alt+A (should not toggle admin mode)
      fireEvent.keyDown(window, { key: 'a', altKey: true });
      expect(screen.queryByText('ADMIN MODE')).not.toBeInTheDocument();
    });

    it('should handle keyboard shortcuts in admin mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Test undo shortcut
      fireEvent.keyDown(window, { key: 'z' });
      expect(consoleSpy).toHaveBeenCalledWith('↶ Undo requested');
      
      // Test redo shortcut
      fireEvent.keyDown(window, { key: 'y' });
      expect(consoleSpy).toHaveBeenCalledWith('↷ Redo requested');
      
      // Test delete shortcut
      fireEvent.keyDown(window, { key: 'Delete' });
      expect(consoleSpy).toHaveBeenCalledWith('🗑️ Delete requested');
      
      // Test save shortcut 
      fireEvent.keyDown(window, { key: 's' });
      expect(consoleSpy).toHaveBeenCalledWith('☁️ Save to cloud requested');
      
      // Test load shortcut
      fireEvent.keyDown(window, { key: 'l' });
      expect(consoleSpy).toHaveBeenCalledWith('📥 Load from cloud requested');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Admin Toolbar Rendering', () => {
    it('should render admin toolbar when admin mode is active', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      // Check that admin toolbar is rendered with all essential elements
      expect(screen.getByText('ADMIN MODE')).toBeInTheDocument();
      expect(screen.getByText('Työkalut:')).toBeInTheDocument();
      
      // Verify core admin functionality is available
      expect(screen.getByText('Undo (Z)')).toBeInTheDocument();
      expect(screen.getByText('Redo (Y)')).toBeInTheDocument();
    });

    it('should maintain admin toolbar visibility during interaction', () => {
      renderHome();
      
      // Enable admin mode
      fireEvent.keyDown(window, { key: 'a' });
      
      const adminToolbar = screen.getByText('ADMIN MODE').closest('div');
      expect(adminToolbar).toBeInTheDocument();
      
      // Interact with toolbar (select a tool)
      fireEvent.click(screen.getByText('LED Strip'));
      
      // Admin toolbar should still be visible
      expect(screen.getByText('ADMIN MODE')).toBeInTheDocument();
    });
  });
});