/**
 * 🔒 CRITICAL: Socket Hooks
 * 
 * Custom hooks for accessing Socket.IO service from components.
 * Separated from context file to support Vite Fast Refresh.
 */

import { useContext } from "react";
import { SocketContext, SocketContextValue } from "../contexts/SocketContextDef";

/**
 * Hook to access Socket.IO service from components
 * 
 * @throws Error if used outside SocketProvider
 */
export function useSocketService(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketService must be used within <SocketProvider>");
  }
  return context;
}

/**
 * Convenience hook to get just the socket instance
 */
export function useSocket() {
  const { service } = useSocketService();
  return service.instance;
}

/**
 * Hook for connection status monitoring
 */
export function useConnectionStatus() {
  const { isConnected, connectionStatus, lastError } = useSocketService();
  return { isConnected, connectionStatus, lastError };
}